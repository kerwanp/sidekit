import { pipeline } from "@xenova/transformers";

/**
 * Reshape a flat Float32Array into [tokens][dimensions]
 */
function reshape(data: Float32Array, dims: number[]): Float32Array[] {
  const [batch, rows, cols] = dims;
  if (batch !== 1) {
    throw new Error("This reshape only handles batch size 1");
  }
  const result: Float32Array[] = [];
  for (let r = 0; r < rows; r++) {
    result.push(data.subarray(r * cols, (r + 1) * cols));
  }
  return result;
}

/**
 * Mean pooling over tokens → single Float32Array
 */
function meanPool(features: Float32Array[]): Float32Array {
  const numTokens = features.length;
  const dim = features[0].length;
  const pooled = new Float32Array(dim);

  for (let t = 0; t < numTokens; t++) {
    const token = features[t];
    for (let d = 0; d < dim; d++) {
      pooled[d] += token[d];
    }
  }

  for (let d = 0; d < dim; d++) {
    pooled[d] /= numTokens;
  }

  return pooled;
}

export async function createEmbed(content: string): Promise<Float32Array> {
  const embedder = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2",
  );

  const { data, dims } = await embedder(content, {
    pooling: "none",
    normalize: false,
  });

  const features = reshape(data as Float32Array, dims);
  const pooled = meanPool(features);

  return pooled;
}
