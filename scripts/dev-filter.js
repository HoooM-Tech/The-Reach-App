const { spawn } = require('child_process')

// Start Next.js dev server
const nextDev = spawn('npx', ['next', 'dev'], {
  stdio: 'pipe',
  shell: true,
})

let stdoutBuffer = ''
let stderrBuffer = ''

// Filter out /api/auth/me logs from stdout
nextDev.stdout.on('data', (data) => {
  stdoutBuffer += data.toString()
  const lines = stdoutBuffer.split('\n')
  stdoutBuffer = lines.pop() || '' // Keep incomplete line in buffer
  
  lines.forEach((line) => {
    // Filter out lines containing GET /api/auth/me
    if (line.trim() && !line.includes('GET /api/auth/me')) {
      process.stdout.write(line + '\n')
    }
  })
})

// Filter out /api/auth/me logs from stderr
nextDev.stderr.on('data', (data) => {
  stderrBuffer += data.toString()
  const lines = stderrBuffer.split('\n')
  stderrBuffer = lines.pop() || '' // Keep incomplete line in buffer
  
  lines.forEach((line) => {
    // Filter out lines containing GET /api/auth/me
    if (line.trim() && !line.includes('GET /api/auth/me')) {
      process.stderr.write(line + '\n')
    }
  })
})

nextDev.on('close', (code) => {
  // Flush remaining buffers
  if (stdoutBuffer && !stdoutBuffer.includes('GET /api/auth/me')) {
    process.stdout.write(stdoutBuffer)
  }
  if (stderrBuffer && !stderrBuffer.includes('GET /api/auth/me')) {
    process.stderr.write(stderrBuffer)
  }
  process.exit(code)
})

// Handle process termination
process.on('SIGINT', () => {
  nextDev.kill('SIGINT')
  process.exit()
})

process.on('SIGTERM', () => {
  nextDev.kill('SIGTERM')
  process.exit()
})

