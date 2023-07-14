export function getSubdomain(url: string): string {
  // remove https protocol from url if exists
  url = url.replace(/^(https?:\/\/)/, "");
  const subdomain = url.split(".")[0];
  if (subdomain) return subdomain;
  else return url;
}
