"use client";

import { type ChangeEvent, useState } from "react";

export function useAutosTreeFilters() {
  const [search, setSearch] = useState("");
  const [order, setOrder] = useState<"newest" | "oldest">("newest");

  function onSearchChange(event: ChangeEvent<HTMLInputElement>) {
    setSearch(event.target.value);
  }

  function toggleOrder() {
    setOrder((current) => (current === "newest" ? "oldest" : "newest"));
  }

  return { search, order, onSearchChange, toggleOrder };
}
