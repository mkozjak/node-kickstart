#!/usr/bin/env python3

import argparse
import rethinkdb as r

cli = argparse.ArgumentParser()

cli.add_argument('-e',
                 '--db-hostname',
                 help='rethinkdb hostname',
                 default='localhost')

cli.add_argument('-n',
                 '--db-name',
                 help='rethinkdb name',
                 default='iptv')

cli.add_argument('-u',
                 '--db-user-name',
                 help='rethinkdb username',
                 default='foo')

cli.add_argument('-p',
                 '--db-user-password',
                 help='rethinkdb user password',
                 default='foo')

args = cli.parse_args()

c = r.connect(db="rethinkdb", host=args.db_hostname)

if args.db_name not in r.db_list().run(c):
    r.db_create(args.db_name).run(c)

r.db("rethinkdb").table("users").insert({
    "id": args.db_user_name,
    "password": args.db_user_password
}).run(c)

r.db(args.db_name).grant(args.db_user_name, {
    'read': True,
    'write': True,
    'config': True
}).run(c)
