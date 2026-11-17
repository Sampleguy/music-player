// The only file that talks to R2.
// options: R2 get options, e.g. { range: request.headers } to read only part of a file.
export const getFile = (env, key, options) => env.BUCKET.get(key, options);
export const hasFile = async (env, key) => !!(await env.BUCKET.head(key));
export const deleteFile = (env, key) => env.BUCKET.delete(key);
export const putFile = (env, key, body, contentType = "application/json") =>
  env.BUCKET.put(key, body, { httpMetadata: { contentType } });

// Total bytes of all files whose key starts with `prefix` (R2 lists 1000 at a time).
export async function totalSize(env, prefix) {
  let bytes = 0, cursor;
  do {
    const page = await env.BUCKET.list({ prefix, cursor });
    for (const o of page.objects) bytes += o.size;
    cursor = page.truncated ? page.cursor : null;
  } while (cursor);
  return bytes;
}
