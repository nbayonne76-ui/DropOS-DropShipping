import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-neutral-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
          <span className="text-white font-bold text-base">D</span>
        </div>
        <span className="font-semibold text-neutral-900 text-xl">DropOS</span>
      </Link>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl border border-neutral-200 shadow-xl shadow-neutral-900/5 p-8">
        {children}
      </div>

      <p className="mt-6 text-xs text-neutral-400">
        &copy; {new Date().getFullYear()} DropOS. All rights reserved.
      </p>
    </div>
  );
}
