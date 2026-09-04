import type { DropdownListItem } from "@/components/dropdown-list";
import FaqSection from "@/components/faq-section";
import FrontHero from "@/components/front-hero";
import ProductsSlideshow from "@/components/products-slideshow";
import { PRODUCTS, toSlideshowProduct } from "@/data/products";
import SignUpBanner from "@/components/sign-up-banner";
import ValuesScrolly, { type ScrollyValue } from "@/components/values-scrolly";

const VALUES_INTRO =
  "We've spent the last months developing a collection built around one idea: movement should feel as good as it looks. Soft, considered fabrics. Cuts that hold their shape. Pieces made to move from the studio into the rest of your day.";

const VALUES: DropdownListItem[] = [
  {
    title: "Care For Your Garments",
    content: [
      "Currently, our garments are available in sizes XS–XL. As an independent brand, we have chosen to begin with a focused size range that allows us to maintain the high standards of quality and craftsmanship we strive for in every garment.",
      "As we grow, our ambition is to expand our size range to include XXS and XXL, creating a more inclusive selection for our community.",
      "If your size is not currently available, we sincerely apologize for the inconvenience and appreciate your understanding as we continue to grow.",
    ],
    image: {
      src: "/dropdown/related-product.jpg",
      alt: "Model wearing the Flöra yoga wear set",
    },
  },
  {
    title: "Our Materials",
    content:
      "Soft, considered natural fabrics chosen for how they move and how they last.",
  },
  {
    title: "Minimal Waste",
    content: "Small, focused runs so nothing is made that will not be worn.",
  },
  {
    title: "Natural Beauty",
    content: "Real skin, real texture, and real bodies in everything we show.",
  },
];

/** Same four values as the accordion above, paired with a photo each for the scrollytelling layout. */
const VALUES_SCROLLY: ScrollyValue[] = [
  {
    title: "Care For Your Garments",
    description:
      "Wash cool, dry flat, and these pieces will outlast the season. Natural fabrics reward a little attention, and asking less of the machine asks less of the planet too.",
    image: {
      src: "/dropdown/related-product.jpg",
      alt: "Model wearing the Flöra yoga wear set",
    },
  },
  {
    title: "Our Materials",
    description:
      "Soft, considered natural fabrics chosen for how they move and how they last. Nothing that looks good once and gives up by the third wear.",
    image: {
      src: "/product/lifestyle-fabric-wave.jpg",
      alt: "Fabric moving in the light",
    },
  },
  {
    title: "Minimal Waste",
    description:
      "Small, focused runs so nothing is made that will not be worn. We would rather sell out than send a season to landfill.",
    image: {
      src: "/product/lifestyle-lying-tiles.jpg",
      alt: "Garment laid out on stone tiles",
    },
  },
  {
    title: "Natural Beauty",
    description:
      "Real skin, real texture, and real bodies in everything we show. What you see in our images is what the garment actually looks like.",
    image: {
      src: "/product/lifestyle-cave-doorway.jpg",
      alt: "Model standing in a cave doorway",
    },
  },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-[60px] pb-[60px] md:gap-[120px] md:pb-[120px]">
      <FrontHero logoPosition="left" />

      <div id="all-items">
        <ProductsSlideshow
          title="All items"
          products={PRODUCTS.map(toSlideshowProduct)}
          seeAllHref="/shop"
          columns={4}
        />
      </div>

      {/* <div id="values">
        <FaqSection
          title="Values"
          intro={VALUES_INTRO}
          items={VALUES}
          introOnMobile={false}
        />
      </div> */}

      {/* Alternative treatment of the same values — kept alongside the accordion above to compare */}
      <div id="values-scrolly">
        <ValuesScrolly
          title="Values"
          intro={VALUES_INTRO}
          values={VALUES_SCROLLY}
        />
      </div>

      <div id="join">
        <SignUpBanner variant="smaller" mobileVariant="clothing" />
      </div>
    </div>
  );
}
