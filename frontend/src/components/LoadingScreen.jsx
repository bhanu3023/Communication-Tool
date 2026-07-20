import { Box, Skeleton, Stack } from '@mui/material';

/** Loading skeleton used while data is fetched. */
export default function LoadingScreen({ rows = 3 }) {
  return (
    <Box>
      <Skeleton variant="rounded" height={120} sx={{ mb: 2, borderRadius: 3 }} />
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={160} sx={{ flex: 1, borderRadius: 3 }} />
        ))}
      </Stack>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={48} sx={{ mb: 1, borderRadius: 2 }} />
      ))}
    </Box>
  );
}
