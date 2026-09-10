// App logo/wordmark: "enorin" plus a "ZERO" badge, used in the sidebar and login page.
export default function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`wordmark inline-flex items-center ${className}`}>
      <span className="text-navy-900">enorin</span>
      <span className="ml-2 rounded-md bg-navy-900 px-1.5 py-0.5 text-[0.6em] font-black tracking-normal text-lime-400">
        ZERO
      </span>
    </span>
  );
}
