import { DesignPagination } from "@/components/ds/DesignPagination";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignCell } from "@/components/ds/DesignCell";
import { DesignLabel } from "@/components/ds/DesignLabel";
import { DesignDivider } from "@/components/ds/DesignDivider";
import { DesignNavigation } from "@/components/ds/DesignNavigation";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";
import { useState } from "react";


const props = [
  { name: "currentPage", type: "number", description: "Active page number (1-indexed)" },
  { name: "pageCount", type: "number", description: "Total number of pages" },
  { name: "onPageClick", type: "(page: number) => void", description: "Page button click handler" },
  { name: "onPrevClick", type: "(page: number) => void", description: "Previous button click handler" },
  { name: "onNextClick", type: "(page: number) => void", description: "Next button click handler" },
  { name: "preservedDistance", type: "number", default: "1", description: "Pages visible around the current page" },
  { name: "size", type: '"default" | "narrow" | "parent"', default: '"default"', description: "Size variant — default (48px), parent (40px), narrow (32px)" },
  { name: "isLastPageAlwaysShown", type: "boolean", default: "false", description: "Always show the last page number" },
];

const PaginationDocs = () => {
  const [page, setPage] = useState(3);
  const [page2, setPage2] = useState(1);
  const [page3, setPage3] = useState(1);

  return (
    <div className="p-10 max-w-5xl">
      <PageHeader
        title="Pagination"
        description="Page navigation control for paginated lists and search results."
      />

      <ComponentSection title="Basic">
        <DesignPagination
          currentPage={page}
          pageCount={10}
          onPageClick={setPage}
          onPrevClick={setPage}
          onNextClick={setPage}
        />
      </ComponentSection>

      <ComponentSection title="Narrow">
        <DesignPagination
          currentPage={page2}
          pageCount={10}
          onPageClick={setPage2}
          onPrevClick={setPage2}
          onNextClick={setPage2}
          size="narrow"
        />
      </ComponentSection>

      <ComponentSection title="Parent">
        <DesignPagination
          currentPage={page3}
          pageCount={10}
          onPageClick={setPage3}
          onPrevClick={setPage3}
          onNextClick={setPage3}
          size="parent"
        />
      </ComponentSection>

      <ComponentSection title="Last page always shown">
        <DesignPagination
          currentPage={page}
          pageCount={20}
          onPageClick={setPage}
          onPrevClick={setPage}
          onNextClick={setPage}
          isLastPageAlwaysShown
        />
      </ComponentSection>

      <ComponentSection title="Real-world usage" description="Search results screen with paginated product list.">
        <DesignCard className="w-full max-w-[375px] p-0 overflow-hidden">
          <DesignNavigation
            title="Search results"
            showBackButton
          />
          <DesignDivider />
          <div className="px-0">
            <DesignLabel text={'42 results for \u201Cheadphones\u201D'} className="px-4 pt-3" />
            <DesignCell title="Wireless Over-Ear" subtitle="Noise cancelling · Black" suffix={<span className="text-sm text-[var(--text-primary)]">€89</span>} />
            <DesignCell title="Sport Earbuds" subtitle="Water resistant · White" suffix={<span className="text-sm text-[var(--text-primary)]">€49</span>} />
            <DesignCell title="Studio Monitor" subtitle="Open back · Silver" suffix={<span className="text-sm text-[var(--text-primary)]">€199</span>} />
            <DesignCell title="Travel Compact" subtitle="Foldable · Navy" suffix={<span className="text-sm text-[var(--text-primary)]">€65</span>} />
          </div>
          <DesignDivider />
          <div className="px-2 py-2">
            <DesignPagination
              currentPage={page}
              pageCount={10}
              onPageClick={setPage}
              onPrevClick={setPage}
              onNextClick={setPage}
              size="narrow"
            />
          </div>
        </DesignCard>
      </ComponentSection>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
        <CodeBlock code={`import { DesignPagination } from '@/components/ds/DesignPagination';
import { useState } from 'react';

const [page, setPage] = useState(1);

<DesignPagination
  currentPage={page}
  pageCount={10}
  onPageClick={(p) => setPage(p)}
  onPrevClick={(p) => setPage(p)}
  onNextClick={(p) => setPage(p)}
/>`} />
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2>
        <PropsTable props={props} />
      </div>
    </div>
  );
};

export default PaginationDocs;
