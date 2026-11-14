#!/usr/bin/env python3
"""Check the hosted chain: Pages client's server -> Render -> Claude (round 114 follow-up).

Creates a throwaway learner, starts its default encounter, sends one turn (the model answers), then deletes the
learner. Opens no port, so it may run on the cluster's login node. Each run costs two model calls on the owner's
Claude subscription.

    PARALLANG_TOKEN=... python3 tools/check_hosted.py [https://parallang.onrender.com] [message]
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request
import uuid

BASE = (sys.argv[1] if len(sys.argv) > 1 else 'https://parallang.onrender.com').rstrip('/')
MESSAGE = sys.argv[2] if len(sys.argv) > 2 else 'Ciao!'
TOKEN = os.environ.get('PARALLANG_TOKEN')


def call(method, path, body=None, learner=None, timeout=180):
    headers = {'Content-Type': 'application/json', 'X-ParaLLang-Token': TOKEN}
    if learner:
        headers['X-Learner-Id'] = learner
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    started = time.time()
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            status, raw = response.status, response.read()
    except urllib.error.HTTPError as error:
        status, raw = error.code, error.read()
    elapsed = time.time() - started
    print(f'{method} {path}: HTTP {status}, {elapsed:.1f} s')
    return status, json.loads(raw or b'null')


def main():
    if not TOKEN:
        sys.exit('Set PARALLANG_TOKEN to the value stored in Render.')
    status, _ = call('GET', '/api/health')  # wakes a sleeping free-plan service (up to about a minute)
    if status != 200:
        sys.exit('Health check failed.')
    status, learner = call('POST', '/api/learner', {})
    if status not in (200, 201):
        sys.exit(f'Learner not created: {learner}')
    learner_id = learner['learnerId']
    failed = False
    try:
        status, started = call('POST', '/api/encounter/start', {}, learner_id)
        encounter = (started or {}).get('encounter') or {}
        if status != 200 or not encounter.get('id'):
            sys.exit(f'Encounter did not start: {started}')
        print(f"  encounter {encounter.get('encounterId')} with {encounter.get('character', {}).get('name')}")
        status, turn = call('POST', '/api/encounter/dialogue', {
            'encounterId': encounter['id'], 'version': encounter.get('version'),
            'attemptId': str(uuid.uuid4()), 'message': MESSAGE,
        }, learner_id)
        after = (turn or {}).get('encounter') or {}
        npc = [line for line in after.get('transcript', []) if line.get('role') == 'npc']
        print(f"  version {encounter.get('version')} -> {after.get('version')}, npc lines {len(npc)}, "
              f"difficulty {encounter.get('difficulty')} -> {after.get('difficulty')}")
        failed = status != 200 or after.get('version') == encounter.get('version')
    finally:
        call('DELETE', '/api/learner', None, learner_id)
    print('FAIL' if failed else 'OK: the model answered a turn through the hosted server')
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
