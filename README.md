# cultivator

A tool for managing infrastructure migrations and, when errors occur, rollback changes. The current migration version
is stored in MongoDB and not in the local file-system, so it can be used with Heroku. It's also designed to be run from
Heroku's [release-phase](https://devcenter.heroku.com/articles/release-phase).

At a high level:

1. Scripts are created and stored in a migrations directory. (this directory is configurable, defaults to 
   `./migrations`)
2. Each script has `up` and `down` functions, that can do anything a script can do. Seed data, add indexes, provision
   new databases, etc..
3. Each script also contains an `id`, which is a `number` that represents the version of this script, used to help with
   ordering the execution of scripts.
3. Assuming your application version is at **123** A call to `Cultivator.run({ dbUrl: 'localhost/test', targetVersion:
   124 })` from your app, will *"migrate up"* to version **124**.
4. Similarly, assuming your application is now at version **124** a call to `Cultivator.run({ dbUrl: 'localhost/test',
   targetVersoin: 123})` from you app, will *"rollback"* to version **123*.


## Installation

Using `npm` from the CLI, download th module and add it to your `package.json` file.

```
$ npm i cultivator -S
```


## Usage

Cultivator can only be `required` as a `module` into an existing application. See the `example`
directory for example migration scripts. Or look over the `test` directory for additional usage.


### The programmatic usage


From within your application.

```
// require the package
const cultivator = require('cultivator')


// define some configuration options
const options = {
    dbUrl: 'mongodb://localhost/test',   // requried - full MongoDB URL
    targetVersion: 1,                    // requried - the version to migrate to
    collection: 'changelog',             // defaults to '_migrations'
    directory: './migratoins'            // defaults to './migrations'
}
    
// start a migration
cultivator.run(options)
    .then(result => {
        // success
        console.log(result.code, result.message)
    })
    .catch(error => {
        // migration failure, 
        console.log(error.error, error.message)
    })
```

The migration scripts must return a promise, where a resolved promise is a successful migration, and a rejected promise
is a failed migration. If a migration fails, it is the responsibility of the script to "undo" any partial migration.


## The configuration object

The run function takes a configuration object for additional customization. The keys are:

  * `dbUrl`  [`string`, required] full MongoDB connection URL
  * `targetVersion` [`number`, required] The **version** to migrate to, can be `up` or `down` from the current version.
  * `directory`  [`string`, optional, defaults to `./migrations`] The directory where the migration scripts are found. 
  * `collection`  [`string`, optional, defaults to `_migrations`] The MongoDB collection that stored the changelog of 
    scripts that have already been successfully executed.


## The Scripts

The scripts for migrating and rolling back are stored in the `migrations` folder (configured above). They are standard node.js
modules that export an object that contains two functions, `migrate` and `rollback`. These functions take no arguments and return
a promise, indicating success or failure.

```
module.exports = {
    id: 1,
    up: () => {
        ...
        return Promise.resolve('done')
    },
    down: () => {
        ...
        return Promise.resolve('done')
    }
}
```

These scripts run standard javascript, so the possibilities of what can be managed is virtually limitless. Good 
candidates are Seeding additional Data and managing indexes.

The script files can be names anything you like. The `id` key is used for ordering when a script should be run. If the
application is at version **42** the `up` script of version **43** would be run next. In the case of a rollback, the 
`down` script of version **43** would be run to return the application to version **42**.

Breaking large migrations into multiple scripts can make handling errors and rolling back a little easier.


## Testing

In order to run the tests, you need to have:

1. An instance of mongodb running at `localhost:27017`.

Tests can be run from `npm` like so:

```
$ npm test
```

These tests will add a database to MongoDB called `cultivator-test-db`.


## PRIOR ART

This module encapsulates
   * https://github.com/emirotin/mongodb-migrations

It was also inspired by:
   * https://github.com/flashstockinc/mongoose-data-migrate
   
which is a fork of
   * https://github.com/madhums/mongoose-migrate

which is a fork of
   * https://github.com/tj/node-migrate


## Road Map

This is quite functional in it's current form but could be made even better:

1. Add CLI support to run migrations and auto-generate stub migrations file.
2. Allow for pre and post scripts for a target version.
