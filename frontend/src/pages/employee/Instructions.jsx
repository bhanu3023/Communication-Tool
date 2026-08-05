import { Box, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import HeadphonesIcon from '@mui/icons-material/HeadphonesOutlined';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOverOutlined';
import EditNoteIcon from '@mui/icons-material/EditNoteOutlined';
import EmojiObjectsOutlinedIcon from '@mui/icons-material/EmojiObjectsOutlined';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import RocketLaunchOutlinedIcon from '@mui/icons-material/RocketLaunchOutlined';

const SKILLS = [
  {
    icon: <HeadphonesIcon color="primary" />,
    title: 'Listening',
    text: 'Understand what clients and teammates really mean — especially on calls and in fast-moving projects.',
  },
  {
    icon: <RecordVoiceOverIcon color="secondary" />,
    title: 'Speaking',
    text: 'Sound clear and confident when you explain ideas, give updates, or walk someone through a task.',
  },
  {
    icon: <EditNoteIcon sx={{ color: '#7b1fa2' }} />,
    title: 'Writing',
    text: 'Send emails and messages that are professional, easy to read, and get the outcome you need.',
  },
];

/**
 * Orientation — why these assessments exist and why they are worth your time.
 * Rules, pass marks, and step-by-step test guidance live on the Test page and inside each test.
 */
export default function Instructions() {
  return (
    <Box sx={{ maxWidth: 880 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Why we practice communication
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.7 }}>
        Strong communication is one of the fastest ways to grow at work — whether you are new to the team or
        already leading projects. This trainer gives you a safe place to practice, see honest feedback, and
        improve at your own pace. There is no trick questions; the goal is to help you show up clearly in
        real conversations.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {SKILLS.map(({ icon, title, text }) => (
          <Grid item xs={12} md={4} key={title}>
            <Card sx={{ height: '100%', borderRadius: 3 }}>
              <CardContent>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                  {icon}
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {title}
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
                  {text}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ mb: 3, borderRadius: 3, bgcolor: 'rgba(48,0,174,0.04)' }}>
        <CardContent>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <EmojiObjectsOutlinedIcon color="primary" sx={{ mt: 0.25 }} />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                A mindset that helps
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                Treat each attempt like practice, not a final exam. Your first try is a baseline — every retake
                is a chance to beat your own best score. Small improvements add up, and your manager sees
                progress so they can support you, not catch you out.
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderRadius: 3 }}>
            <CardContent>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                <RocketLaunchOutlinedIcon color="primary" />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  When you are ready
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                Open <strong>Test</strong> in the sidebar, choose the level available to you, and start with
                whichever section feels right — Listening, Speaking, or Writing. You can come back later for
                the others. Each test walks you through what to do on screen.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderRadius: 3 }}>
            <CardContent>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                <FavoriteBorderIcon color="secondary" />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  You are not alone
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                Everyone starts somewhere. Use your <strong>Dashboard</strong> to see how you are improving,
                and take your time between attempts. Consistency beats perfection — showing up regularly is
                how skills stick.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
