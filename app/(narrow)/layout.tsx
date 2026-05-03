export default function NarrowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-[1088px] min-w-0 overflow-x-hidden px-4 pt-0 pb-8 sm:px-6 lg:px-8">
      {children}
    </main>
  );
}
