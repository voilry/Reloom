// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_handy_malice.sql';
import m0001 from './0001_colorful_mysterio.sql';
import m0002 from './0002_fair_thor.sql';
import m0003 from './0003_legal_miek.sql';
import m0004 from './0004_panoramic_black_tom.sql';
import m0005 from './0005_round_warlock.sql';
import m0006 from './0006_nice_nick_fury.sql';
import m0007 from './0007_jittery_phantom_reporter.sql';
import m0008 from './0008_add_location_fields.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003,
m0004,
m0005,
m0006,
m0007,
m0008
    }
  }
  