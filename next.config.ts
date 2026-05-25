import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PDFKit loads its standard fonts (Helvetica.afm etc.) via dynamic require at
  // runtime — Next.js's bundler can't see those reads and drops the files. Marking
  // it as an external server package keeps it as a plain Node import, so the AFM
  // files stay reachable at node_modules/pdfkit/js/data/*.afm in the runtime.
  serverExternalPackages: ['pdfkit'],
};

export default nextConfig;
