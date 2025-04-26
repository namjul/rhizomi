import os from "os";
import path from "path";

export function resolveTildePath(filePath: string) {
  if (!filePath || !filePath.startsWith('~')) {
    return filePath;
  }
  return path.join(os.homedir(), filePath.slice(1));
}

export function resolvePath(dir: string, urlPath: string) {

  // Remove `..` to prevent directory traversal
  const sanitizedPath = urlPath.replace(/\.\./g, '');

  // Default to "readme" if root path is requested
  let potentialPath = sanitizedPath === '/' ? 'readme' : sanitizedPath;

  // Join with the base directory
  let fullPath = path.join(dir, potentialPath);

  return resolveTildePath(fullPath);
}

