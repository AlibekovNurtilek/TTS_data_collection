import React, { createContext, useContext, useState } from "react";

interface BookContextType {
  currentBookTitle: string | null;
  setCurrentBookTitle: (title: string | null) => void;
}

const BookContext = createContext<BookContextType | undefined>(undefined);

export function BookProvider({ children }: { children: React.ReactNode }) {
  const [currentBookTitle, setCurrentBookTitle] = useState<string | null>(null);

  return (
    <BookContext.Provider value={{ currentBookTitle, setCurrentBookTitle }}>
      {children}
    </BookContext.Provider>
  );
}

export function useBook() {
  const context = useContext(BookContext);
  if (context === undefined) {
    throw new Error("useBook must be used within a BookProvider");
  }
  return context;
}

