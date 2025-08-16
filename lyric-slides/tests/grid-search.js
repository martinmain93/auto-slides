#!/usr/bin/env node
/*
Simple grid search runner for slide-matching hyperparameters.
Usage examples:
  node tests/grid-search.js --runs=3 --acceptNext=0.6,0.7,0.8 --acceptAny=0.55,0.6 --window=500,650,800 --minAdv=1,2 --minUpd=2,3

It runs `vitest run` repeatedly with environment variables:
  - ACCEPT_NEXT, ACCEPT_ANY, BLANK_T, CROSS_T, WINDOW_MS, MIN_ADV, MIN_UPD, DEBUG_SPEECH
and parses AGGREGATE_SCORE/COUNT/AVG from stdout.
*/

import { spawnSync } from 'node:child_process'

function parseList(arg, def) {
  if (!arg) return def
  return arg.split(',').map((x) => x.trim()).filter(Boolean)
}

function* product(obj) {
  const keys = Object.keys(obj)
  function* rec(idx, acc) {
    if (idx === keys.length) { yield acc; return }
    const k = keys[idx]
    for (const v of obj[k]) {
      yield* rec(idx + 1, { ...acc, [k]: v })
    }
  }
  yield* rec(0, {})
}

function tail(str, n = 40) {
  const lines = (str || '').split(/\r?\n/)
  return lines.slice(-n).join('\n')
}

function runOne(env, opts = {}) {
  const { verbose = false } = opts
  if (verbose) console.log(`[GRID] Running vitest with env=${JSON.stringify(env)}`)
  const proc = spawnSync('npx', ['vitest', 'run'], {
    stdio: 'pipe',
    env: { CI: '1', ...process.env, ...env },
    encoding: 'utf8',
  })
  const out = (proc.stdout || '') + '\n' + (proc.stderr || '')
  const m = out.match(/AGGREGATE_SCORE: (\d+) COUNT: (\d+) AVG: (\d+)/)
  const result = m ? { score: Number(m[1]), count: Number(m[2]), avg: Number(m[3]), ok: true } : { ok: false }
  if (verbose) {
    console.log(`[GRID] vitest exit code=${proc.status}`)
    if (!result.ok) {
      console.log('[GRID] Could not find AGGREGATE line. Output tail:')
      console.log(tail(out, 80))
    }
  }
  return { code: proc.status, result, out }
}

function main() {
  const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')))
  const verbose = args.verbose === '1' || args.verbose === 'true'
  const debugSpeech = args.debug === '1' || args.debug === 'true'
  const runs = Number(args.runs ?? 1)
  const acceptNext = parseList(args.acceptNext, ['0.7'])
  const acceptAny = parseList(args.acceptAny, ['0.6'])
  const blankT = parseList(args.blankT, ['0.45'])
  const crossT = parseList(args.crossT, ['0.8'])
  const windowMs = parseList(args.window, ['650'])
  const minAdv = parseList(args.minAdv, ['2'])
  const minUpd = parseList(args.minUpd, ['2'])

  const combos = []
  for (const env of product({ ACCEPT_NEXT: acceptNext, ACCEPT_ANY: acceptAny, BLANK_T: blankT, CROSS_T: crossT, WINDOW_MS: windowMs, MIN_ADV: minAdv, MIN_UPD: minUpd })) {
    combos.push(env)
  }

  let best = null
  for (const baseEnv of combos) {
    const env = { ...baseEnv }
    if (debugSpeech) env.DEBUG_SPEECH = '1'
    let total = 0
    let ok = true
    for (let i = 0; i < runs; i++) {
      const { code, result } = runOne(env, { verbose })
      if (code !== 0 || !result.ok) { ok = false; break }
      total += result.score
    }
    if (ok) {
      const avgScore = Math.round(total / runs)
      console.log(`GRID RESULT env=${JSON.stringify(env)} avgScore=${avgScore}`)
      if (!best || avgScore > best.avg) best = { env, avg: avgScore }
    } else {
      console.log(`GRID RESULT env=${JSON.stringify(env)} failed`)
    }
  }

  if (best) {
    console.log(`GRID BEST env=${JSON.stringify(best.env)} avg=${best.avg}`)
  } else {
    console.log('GRID: no successful runs')
  }
}

main()

