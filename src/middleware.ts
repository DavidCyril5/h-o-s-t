import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This middleware currently does nothing and simply passes the request through.
// It exists to satisfy the Next.js build requirement for a middleware file.
// All route protection logic has been moved into individual page and layout components
// to prevent "Edge runtime" errors with database connections.
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

// By not exporting a 'config' object with a 'matcher', this middleware
// will not run on any routes, effectively disabling it while keeping a valid file structure.
