import DropdownList, { type DropdownListItem } from "./dropdown-list";

/**
 * Title, intro paragraph and accordion, from the Figma FAQ page and the Values block on the front page.
 * Desktop puts the text left and the 521px accordion right; mobile stacks them.
 */
export default function FaqSection({
  title,
  intro,
  items,
  introOnMobile = true,
  capViewport = false,
  headingLevel = "h2",
  className = "",
}: {
  title: string;
  intro?: string;
  items: DropdownListItem[];
  /** The front page hides the intro below `md`; the FAQ page keeps it. */
  introOnMobile?: boolean;
  /** Cap the block at one viewport on desktop so a short list never leaves a tall gap before the next section. */
  capViewport?: boolean;
  headingLevel?: "h1" | "h2";
  className?: string;
}) {
  const Heading = headingLevel;
  return (
    <section
      className={`flex flex-col gap-[24px] px-[24px] md:grid md:grid-cols-2 md:items-start md:gap-[42px] md:px-[42px] ${
        capViewport ? "md:max-h-screen md:pb-[42px]" : ""
      } ${className}`}
    >
      <div className="flex flex-col gap-[24px]">
        <Heading className="m-0 font-americana text-big-header-mobile capitalize text-black md:text-big-header-desktop">{title}</Heading>
        {intro && (
          <p className={`w-full font-gotham text-paragraph text-black/70 md:w-[521px] ${introOnMobile ? "" : "hidden md:block"}`}>
            {intro}
          </p>
        )}
      </div>
      <div className="w-full md:w-[521px] md:justify-self-end">
        <DropdownList items={items} />
      </div>
    </section>
  );
}
