/**
 * Embedding Client for Memory System
 *
 * Uses OpenAI-compatible API for text embeddings.
 * Default endpoint is local macmini server for zero API cost.
 */

import OpenAI from "openai";
import { memoryLogger, type LoggerInstance } from "../logger.js";
import type { RuntimeEnvironment } from "../runtime-environment.js";

/**
 * Embedding client using OpenAI-compatible API
 *
 * Required environment variables:
 * - WOPAL_EMBEDDING_BASE_URL: Embedding API endpoint
 * - WOPAL_EMBEDDING_API_KEY: API key for embedding service
 * - WOPAL_EMBEDDING_MODEL: Model name (optional)
 */
export class EmbeddingClient {
  private client: OpenAI;
  private model: string;
  private logger: LoggerInstance;

  constructor(
    environment: RuntimeEnvironment = process.env,
    logger: LoggerInstance = memoryLogger,
  ) {
    this.logger = logger;
    const baseURL = environment.WOPAL_EMBEDDING_BASE_URL;
    const apiKey = environment.WOPAL_EMBEDDING_API_KEY;

    if (!baseURL) {
      throw new Error(
        "EmbeddingClient requires WOPAL_EMBEDDING_BASE_URL environment variable"
      );
    }

    this.model = environment.WOPAL_EMBEDDING_MODEL ?? "";

    if (!this.model) {
      throw new Error(
        "EmbeddingClient requires WOPAL_EMBEDDING_MODEL environment variable"
      );
    }

    this.client = new OpenAI({
      baseURL,
      apiKey: apiKey ?? "ollama",
      timeout: 60_000,
    });

    this.logger.info(`EmbeddingClient ready: ${this.model} @ ${baseURL}`);
  }

  /**
   * Get embeddings for multiple texts
   *
   * @param texts - Array of text strings to embed
   * @returns Array of embedding vectors (number[][])
   */
  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: texts,
      });

      const embeddings = response.data.map((item) => item.embedding);

      return embeddings;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Embedding failed: ${message}`);
      throw new Error(`Embedding failed: ${message}`);
    }
  }

  /**
   * Get embedding for a single text
   *
   * @param text - Text string to embed
   * @returns Embedding vector (number[])
   */
  async embedSingle(text: string): Promise<number[]> {
    const embeddings = await this.embed([text]);
    return embeddings[0] ?? [];
  }

  /**
   * Convert embedding to Float32Array for LanceDB
   */
  toFloat32Array(embedding: number[]): Float32Array {
    return new Float32Array(embedding);
  }

  /**
   * Get current model name
   */
  getModel(): string {
    return this.model;
  }
}
