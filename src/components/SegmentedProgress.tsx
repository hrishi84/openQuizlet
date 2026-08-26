import Box from "@mui/material/Box";

/**
 * Quizlet-style segmented progress: one segment per round of `perSegment`
 * answers. Completed segments stay lit, the current one fills as you answer.
 */
export default function SegmentedProgress({
  value,
  max,
  perSegment = 7,
}: {
  value: number;
  max: number;
  perSegment?: number;
}) {
  const segments = Math.max(1, Math.ceil(max / perSegment));
  return (
    <Box sx={{ display: "flex", gap: 0.75, mb: 3 }}>
      {Array.from({ length: segments }).map((_, i) => {
        const fill = Math.min(1, Math.max(0, (value - i * perSegment) / perSegment));
        const complete = fill >= 1;
        return (
          <Box
            key={i}
            sx={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              bgcolor: "action.hover",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                width: `${fill * 100}%`,
                borderRadius: 3,
                bgcolor: "#0071e3",
                opacity: complete ? 1 : 0.75,
                boxShadow: complete ? "0 0 8px rgba(0,113,227,0.5)" : "none",
                transition: "width .45s cubic-bezier(.4,0,.2,1), opacity .3s ease",
              }}
            />
          </Box>
        );
      })}
    </Box>
  );
}
