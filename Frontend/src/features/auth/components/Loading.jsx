
import React from 'react'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

const Loading = ({ message = 'Please wait...' }) => {
    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 2,
                background: '#f8fafc',
            }}
        >
            <CircularProgress
                size={55}
                thickness={4}
                sx={{ color: '#6366f1' }}
                aria-label="Loading"
            />

            <Typography
                variant="body2"
                sx={{
                    color: '#64748b',
                    fontWeight: 500,
                    letterSpacing: '0.3px',
                }}
            >
                {message}
            </Typography>
        </Box>
    )
}

export default Loading
