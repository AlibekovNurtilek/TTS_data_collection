import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setPagination } from "@/store/paginationSlice";

interface PaginationProps {
  paginationKey: string;
  total: number;
  pageNumber: number;
  limit: number;
  onPageChange?: (pageNumber: number) => void;
  className?: string;
}

export function Pagination({
  paginationKey,
  total,
  pageNumber,
  limit,
  onPageChange,
  className = "",
}: PaginationProps) {
  const dispatch = useAppDispatch();
  const totalPages = Math.ceil(total / limit);

  const handlePageChange = (newPageNumber: number) => {
    if (newPageNumber < 1 || newPageNumber > totalPages) return;
    
    dispatch(
      setPagination({
        key: paginationKey,
        pageNumber: newPageNumber,
        limit,
      })
    );
    
    if (onPageChange) {
      onPageChange(newPageNumber);
    }
  };

  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <Button
        variant="outline"
        onClick={() => handlePageChange(pageNumber - 1)}
        disabled={pageNumber === 1}
        className="gap-2"
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {pageNumber} of {totalPages} ({total} total)
      </span>
      <Button
        variant="outline"
        onClick={() => handlePageChange(pageNumber + 1)}
        disabled={pageNumber >= totalPages}
        className="gap-2"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

