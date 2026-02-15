export default function NarrowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-[1088px] px-4 sm:px-6 lg:px-8 pt-0 pb-8">
      {children}
    </main>
  );
}
