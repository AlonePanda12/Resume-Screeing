import { useShortlistedCount } from "@/hooks/useShortlistedCount";

export default function ShortlistedBadge() {
  const { data: count, isLoading, isError } = useShortlistedCount();

  if (isLoading || isError || !count) return null; // hide while loading or when 0

  return (
    <span
      className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
      title="Shortlisted resumes"
    >
      {count}
    </span>
  );
}
