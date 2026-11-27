import Link from "next/link";

/** How many rows a list starts with, and how many each press adds. */
export const PAGE = 20;

/** `?show=60` → 60, kept between one page and a ceiling so a typed number can't ask for everything at once. */
export function parseShow(value: string | undefined, ceiling = 2000): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= PAGE ? Math.min(n, ceiling) : PAGE;
}

/*
 * The foot of a long list: how much of it is showing, and a way to see more. A list opens with a
 * screenful, not everything there is; "Show more" adds another screenful under what is already
 * there without moving the page (the link keeps the scroll position), and "Show all" is one press
 * away for anyone who wants to search the page with the browser.
 *
 * Like the filters, it is an address (`?show=40`), so reloading, going back or sharing the link
 * shows the same list. `params` is everything else the address must keep.
 */
export default function ShowMore({ path, params = [], shown, total, noun }: { path: string; params?: [string, string][]; shown: number; total: number; noun: [string, string] }) {
  if (total === 0) return null;
  const href = (show: number) => `${path}?${new URLSearchParams([...params, ["show", String(show)]]).toString()}`;
  const left = total - shown;
  const next = Math.min(PAGE, left);
  const button = "flex items-center justify-center border border-black px-[18px] py-[10px] font-gotham text-paragraph text-black transition-colors hover:bg-black hover:text-white";
  return (
    <div className="flex flex-wrap items-center justify-between gap-[12px] pt-[18px] font-gotham text-[11px] leading-normal text-black/50">
      <span>
        {left > 0 ? `Showing ${shown} of ${total} ${total === 1 ? noun[0] : noun[1]}` : `${total === 1 ? `The only ${noun[0]}` : `All ${total} ${noun[1]}`}`}
      </span>
      {left > 0 && (
        <span className="flex flex-wrap gap-[10px]">
          <Link href={href(shown + next)} scroll={false} className={button}>
            Show {next} more
          </Link>
          {left > next && (
            <Link href={href(total)} scroll={false} className="flex items-center px-[6px] font-gotham text-paragraph text-black underline underline-offset-4 hover:opacity-60">
              Show all
            </Link>
          )}
        </span>
      )}
    </div>
  );
}
