'use client';

import {
  Badge,
  Button,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/design';
import { format } from '@repo/utils';
import { Download } from 'lucide-react';
import Link from 'next/link';
import { type FC, useEffect, useMemo, useState } from 'react';

import { trpc } from '@/core';

/** The number of items to show per page */
const PAGE_SIZE = 10;

/** Renders a table of invoices */
export const BillingHistory: FC = () => {
  const { data, isLoading } = trpc.billing.getHistory.useQuery();
  const history = useMemo(() => data?.history ?? [], [data?.history]);

  // Mobile "show more" state
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, []);
  const mobileVisibleItems = useMemo(
    () => history.slice(0, visibleCount),
    [history, visibleCount]
  );
  const hasMoreMobile = visibleCount < history.length;

  // Desktop pagination state
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(history.length / PAGE_SIZE));
  useEffect(() => {
    setPage((p) => Math.min(p, pageCount));
  }, [pageCount]);
  const desktopPageItems = useMemo(() => {
    const startIndex = (page - 1) * PAGE_SIZE;
    return history.slice(startIndex, startIndex + PAGE_SIZE);
  }, [history, page]);

  // Loading state UI
  if (isLoading) {
    return (
      <>
        {/* Mobile skeleton */}
        <div className="sm:hidden">
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: The only unique info here is the index
              <div className="rounded-md border p-3" key={index}>
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-5 w-14" />
                </div>
                <div className="mt-4">
                  <Skeleton className="h-9 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Desktop skeleton */}
        <div className="hidden sm:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Skeleton className="h-4 max-w-18 flex-1" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 3 }).map((_, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: The only unique info here is the index
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-4 max-w-18 flex-1" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 max-w-18 flex-1" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 max-w-18 flex-1" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 max-w-14 flex-1" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 max-w-24 flex-1" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </>
    );
  }

  // If there is no history, show a message
  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center py-6 text-center text-muted-foreground">
        No billing history yet
      </div>
    );
  }

  return (
    <>
      {/* Mobile list */}
      <div className="sm:hidden">
        <div className="flex flex-col gap-4">
          {mobileVisibleItems.map((item) => (
            <div
              className="rounded-md border p-3"
              key={item.id ?? `${item.type}-${item.date.toString()}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">
                  {format.case(item.type, 'sentenceCase')}
                </div>
                <div className="text-muted-foreground text-sm">
                  {format.date(item.date)}
                </div>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <div className="text-sm">{format.currency(item.amount)}</div>
                <div>
                  <Badge>{format.case(item.status, 'sentenceCase')}</Badge>
                </div>
              </div>
              {item.receiptUrl && (
                <div className="mt-4">
                  <Button
                    asChild
                    className="w-full"
                    disabled={!item.receiptUrl}
                    size="sm"
                    variant="outline"
                  >
                    <Link
                      href={item.receiptUrl ?? ''}
                      rel="noreferrer noopener"
                      target="_blank"
                    >
                      Download <Download />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          ))}
          {/* If there are more items, show a button to show more */}
          {hasMoreMobile && (
            <Button
              className="w-full"
              onClick={() =>
                setVisibleCount((c) => Math.min(c + PAGE_SIZE, history.length))
              }
              variant="outline"
            >
              Show more
            </Button>
          )}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {desktopPageItems.map((item) => (
              <TableRow key={item.id ?? `${item.type}-${item.date.toString()}`}>
                <TableCell>{format.case(item.type, 'sentenceCase')}</TableCell>
                <TableCell>{format.date(item.date)}</TableCell>
                <TableCell>{format.currency(item.amount)}</TableCell>
                <TableCell>
                  <Badge>{format.case(item.status, 'sentenceCase')}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {item.receiptUrl && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button
                        asChild
                        className="order-last w-full sm:order-none sm:w-auto"
                        disabled={!item.receiptUrl}
                        size="sm"
                        variant="outline"
                      >
                        <Link
                          href={item.receiptUrl ?? ''}
                          rel="noreferrer noopener"
                          target="_blank"
                        >
                          Download <Download />
                        </Link>
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {/* If there are multiple pages, show pagination */}
        {pageCount > 1 && (
          <Pagination className="mt-4 justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage((p) => Math.max(1, p - 1));
                  }}
                />
              </PaginationItem>
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((pg) => (
                <PaginationItem key={pg}>
                  <PaginationLink
                    href="#"
                    isActive={pg === page}
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(pg);
                    }}
                  >
                    {pg}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage((p) => Math.min(pageCount, p + 1));
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </>
  );
};
