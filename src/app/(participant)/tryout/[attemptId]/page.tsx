import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { QuizRunner } from "@/components/quiz/QuizRunner";
import { RunnerData } from "@/types";

export default async function TryoutRunnerPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const { supabase, user } = await requireUser();

  // Call get_attempt_runner RPC
  const { data: rawData, error } = await supabase.rpc("get_attempt_runner", {
    p_attempt_id: attemptId,
  });

  if (error || !rawData) {
    console.warn("Attempt not found or has been reset:", attemptId);
    redirect("/dashboard");
  }

  const runnerData = rawData as RunnerData;

  // If attempt is already submitted or expired, redirect to result page
  if (runnerData.status === "submitted" || runnerData.status === "expired") {
    redirect(`/results/${attemptId}`);
  }

  return <QuizRunner initialData={runnerData} />;
}
