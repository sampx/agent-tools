/**
 * ProcessRegistry - 进程注册表
 * 
 * 管理所有会话的注册、查询和删除
 */

const fs = require('fs');
const path = require('path');
const { ProcessSession, SESSION_DIR } = require('./session');

class ProcessRegistry {
  static listRunning() {
    const sessions = [];
    
    if (!fs.existsSync(SESSION_DIR)) {
      return sessions;
    }
    
    const files = fs.readdirSync(SESSION_DIR).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      try {
        const filePath = path.join(SESSION_DIR, file);
        const meta = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (!meta.exited) {
          try {
            const pid = parseInt(meta.id.split('-')[0]);
            process.kill(pid, 0);
            sessions.push(meta);
          } catch {
            meta.exited = true;
            meta.finishedAt = Date.now();
            fs.writeFileSync(filePath, JSON.stringify(meta, null, 2));
          }
        }
      } catch (err) {
        // 忽略读取错误，继续处理下一个文件
      }
    }
    return sessions;
  }
  
  static listFinished() {
    const sessions = [];
    
    if (!fs.existsSync(SESSION_DIR)) {
      return sessions;
    }
    
    const files = fs.readdirSync(SESSION_DIR).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      try {
        const meta = JSON.parse(fs.readFileSync(path.join(SESSION_DIR, file), 'utf-8'));
        if (meta.exited) {
          sessions.push(meta);
        }
      } catch (err) {
        // 忽略读取错误
      }
    }
    return sessions;
  }
  
  static listAll() {
    return [...this.listRunning(), ...this.listFinished()];
  }
  
  static getSession(id) {
    const metaFile = path.join(SESSION_DIR, `${id}.json`);
    if (!fs.existsSync(metaFile)) return null;
    
    const meta = JSON.parse(fs.readFileSync(metaFile));
    const session = new ProcessSession(meta.id, meta.command, {
      cwd: meta.cwd,
      env: meta.env,
      name: meta.name,
      tags: meta.tags,
      pty: meta.pty
    });
    Object.assign(session, meta);
    return session;
  }
  
  static deleteSession(id) {
    const session = this.getSession(id);
    if (session) {
      session.delete();
      return true;
    }
    return false;
  }
  
  static clearFinished() {
    const finished = this.listFinished();
    let count = 0;
    for (const meta of finished) {
      if (this.deleteSession(meta.id)) {
        count++;
      }
    }
    return count;
  }
}

module.exports = { ProcessRegistry };
