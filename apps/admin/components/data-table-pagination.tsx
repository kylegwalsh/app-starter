import {
  Button,
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/design';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from 'lucide-react';

type DataTablePaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (perPage: number) => void;
  /** Label for the "Showing X of Y <label>" text */
  label?: string;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];

/** Generate page numbers with ellipsis for large page counts */
const getPageNumbers = (current: number, total: number): (number | 'ellipsis')[] => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [1];

  if (current > 3) {
    pages.push('ellipsis');
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push('ellipsis');
  }

  pages.push(total);
  return pages;
};

export const DataTablePagination = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  label = 'results',
}: DataTablePaginationProps) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
      <p className="text-muted-foreground text-sm">
        Showing {startItem}–{endItem} of {totalItems} {label}
      </p>

      <div className="flex items-center gap-4">
        {onItemsPerPageChange && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Rows</span>
            <Select
              value={String(itemsPerPage)}
              onValueChange={(v) => onItemsPerPageChange(Number(v))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            {/* First page */}
            <PaginationItem>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                aria-label="First page"
              >
                <ChevronsLeftIcon className="size-4" />
              </Button>
            </PaginationItem>

            {/* Previous */}
            <PaginationItem>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Previous page"
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
            </PaginationItem>

            {/* Page numbers (hidden on mobile) */}
            {pages.map((page, i) =>
              page === 'ellipsis' ? (
                <PaginationItem key={`ellipsis-${i}`} className="hidden sm:list-item">
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={page} className="hidden sm:list-item">
                  <Button
                    variant={currentPage === page ? 'outline' : 'ghost'}
                    size="icon"
                    className="size-8"
                    onClick={() => onPageChange(page)}
                    aria-label={`Page ${page}`}
                    aria-current={currentPage === page ? 'page' : undefined}
                  >
                    {page}
                  </Button>
                </PaginationItem>
              ),
            )}

            {/* Mobile page indicator */}
            <PaginationItem className="sm:hidden">
              <span className="text-muted-foreground px-2 text-sm">
                {currentPage} / {totalPages}
              </span>
            </PaginationItem>

            {/* Next */}
            <PaginationItem>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                aria-label="Next page"
              >
                <ChevronRightIcon className="size-4" />
              </Button>
            </PaginationItem>

            {/* Last page */}
            <PaginationItem>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                aria-label="Last page"
              >
                <ChevronsRightIcon className="size-4" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
};
