/** Shown while a page is fetched from the server: lines for the text, tiles for the photos. */
export default function Loading() {
  return (
    <main className="flex min-h-svh flex-col gap-[42px] px-[24px] pt-[96px] pb-[60px] md:px-[42px]">
      <div aria-hidden className="flex flex-col gap-[12px]">
        <span className="hairline w-[40%]" />
        <span className="hairline w-[62%]" />
      </div>
      <div aria-hidden className="grid grid-cols-2 gap-[12px] md:grid-cols-3 md:gap-[42px]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-[12px]">
            <div className="loader-tile relative aspect-[4/5] bg-[#f7f7f7]" />
            <span className="hairline w-[60%]" />
          </div>
        ))}
      </div>
    </main>
  );
}
