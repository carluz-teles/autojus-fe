"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import {
  emptyDetails,
  type Feedback,
  type FeedbackDetails,
  feedbackDetailsSchema,
} from "../../services/feedback";

export function useFeedbackForm() {
  const [editing, setEditing] = useState(false);
  const form = useForm<FeedbackDetails>({
    resolver: zodResolver(feedbackDetailsSchema),
    defaultValues: emptyDetails,
  });
  function open(state: Feedback) {
    form.reset({
      reason_code: state.reason_code ?? "",
      comment: state.comment ?? "",
      correction: state.correction ?? "",
    });
    setEditing(true);
  }
  function close() {
    setEditing(false);
  }
  return { form, editing, open, close };
}
