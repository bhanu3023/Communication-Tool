import { Component } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReportProblemIcon from '@mui/icons-material/ReportProblemOutlined';

// A failed dynamic import is not a bug in the page — it means this tab is running an old
// build whose code-split chunks were replaced by a deploy. The only cure is to reload and
// pick up the new index.html, so we do it automatically instead of showing an error.
const CHUNK_ERROR = /dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk .* failed/i;

// Loop guard. A flat "only ever reload once" flag would stop a LATER deploy from self-healing
// in a long-lived tab, so we record WHEN we last reloaded and refuse only if it was seconds
// ago — that breaks a tight loop from a genuinely broken build while still healing next time.
const RELOAD_AT = 'chunkReloadAt';
const RELOAD_COOLDOWN_MS = 10_000;

const reloadedRecently = () => {
  const at = Number(sessionStorage.getItem(RELOAD_AT) || 0);
  return at > 0 && Date.now() - at < RELOAD_COOLDOWN_MS;
};

const isChunkError = (error) =>
  CHUNK_ERROR.test(`${error?.name || ''} ${error?.message || ''}`);

/**
 * Catches render errors anywhere below it so a crash shows a recoverable message rather
 * than a blank page. The app previously had no boundary at all: any thrown error unmounted
 * the whole tree and left a white screen with nothing to click.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, reloading: false };
  }

  static getDerivedStateFromError(error) {
    return { error, reloading: isChunkError(error) };
  }

  componentDidCatch(error, info) {
    if (isChunkError(error)) {
      if (!reloadedRecently()) {
        sessionStorage.setItem(RELOAD_AT, String(Date.now()));
        window.location.reload();
        return;
      }
      // Reloading did not help — fall through to the visible error instead of looping.
      this.setState({ reloading: false });
    }
    // eslint-disable-next-line no-console
    console.error('Unhandled UI error:', error, info?.componentStack);
  }

  render() {
    const { error, reloading } = this.state;
    if (!error) return this.props.children;

    if (reloading) {
      // Mid-reload: render nothing rather than flashing an error the user cannot act on.
      return null;
    }

    return (
      <Box sx={{ p: 3, display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <Paper sx={{ p: 4, borderRadius: 3, maxWidth: 560, textAlign: 'center' }}>
          <ReportProblemIcon color="warning" sx={{ fontSize: 44, mb: 1 }} />
          <Typography variant="h6" gutterBottom>
            Something went wrong on this screen
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Your work is not lost — anything already saved is safe. Reloading usually fixes it.
          </Typography>
          {error?.message && (
            <Typography
              variant="caption"
              component="pre"
              sx={{
                display: 'block',
                textAlign: 'left',
                bgcolor: '#f5f7fb',
                borderRadius: 2,
                p: 1.5,
                mb: 2,
                overflowX: 'auto',
                color: 'text.secondary',
              }}
            >
              {error.message}
            </Typography>
          )}
          <Stack direction="row" spacing={1.5} justifyContent="center">
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={() => {
                sessionStorage.removeItem(RELOAD_AT);
                window.location.reload();
              }}
            >
              Reload
            </Button>
            <Button onClick={() => this.setState({ error: null, reloading: false })}>
              Try again
            </Button>
          </Stack>
        </Paper>
      </Box>
    );
  }
}
