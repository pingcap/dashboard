const vpData = {
  main: {
    name: 'HashJoin_9',
    cost: 101530.25,
    est_rows: 4162.5,
    act_rows: 0,
    access_table: 'access_table',
    access_index: 'access_index',
    access_partition: 'access_partition',
    time_us: 628.9,
    run_at: 'root',
    children: [
      {
        name: 'TableReader_12(Build)',
        cost: 43608.83,
        est_rows: 3330.0,
        act_rows: 0,
        access_table: 'access_table',
        access_index: 'access_index',
        access_partition: 'access_partition',
        time_us: 400,
        run_at: 'root',
        children: [
          {
            name: 'Selection_11',
            cost: 600020.0,
            est_rows: 3330.0,
            act_rows: 0,
            access_table: 'access_table',
            access_index: 'access_index',
            access_partition: 'access_partition',
            time_us: 200,
            run_at: 'cop[tikv]',
            children: [
              {
                name: 'TableFullScan_10',
                cost: 570020.0,
                est_rows: 10000.0,
                act_rows: 0,
                access_table: 'access_table',
                access_index: 'access_index',
                access_partition: 'access_partition',
                time_us: 10,
                run_at: 'cop[tikv]',
              },
            ],
          },
          {
            name: 'Selection_111111',
            cost: 600020.0,
            est_rows: 3330.0,
            act_rows: 0,
            access_table: 'access_table',
            access_index: 'access_index',
            access_partition: 'access_partition',
            time_us: 180,
            run_at: 'cop[tikv]',
            children: [
              {
                name: 'TableFullScan_1000000',
                cost: 570020.0,
                est_rows: 10000.0,
                act_rows: 0,
                access_table: 'access_table',
                access_index: 'access_index',
                access_partition: 'access_partition',
                time_us: 60,
                run_at: 'cop[tikv]',
              },
              {
                name: 'TableFullScan_1000001',
                cost: 570020.0,
                est_rows: 10000.0,
                act_rows: 0,
                access_table: 'access_table',
                access_index: 'access_index',
                access_partition: 'access_partition',
                time_us: 60,
                run_at: 'cop[tikv]',
              },
              {
                name: 'TableFullScan_100000',
                cost: 570020.0,
                est_rows: 10000.0,
                act_rows: 0,
                access_table: 'access_table',
                access_index: 'access_index',
                access_partition: 'access_partition',
                time_us: 60,
                run_at: 'cop[tikv]',
                children: [
                  {
                    name: 'TableFullScan_1023000',
                    cost: 570020.0,
                    est_rows: 10000.0,
                    act_rows: 0,
                    access_table: 'access_table',
                    access_index: 'access_index',
                    access_partition: 'access_partition',
                    time_us: 60,
                    run_at: 'cop[tikv]',
                  },
                ],
              },
              {
                name: 'TableFullScan_1050000',
                cost: 570020.0,
                est_rows: 10000.0,
                act_rows: 0,
                access_table: 'access_table',
                access_index: 'access_index',
                access_partition: 'access_partition',
                time_us: 60,
                run_at: 'cop[tikv]',
              },
            ],
          },
        ],
      },
      {
        name: 'TableReader_15(Probe)',
        cost: 45412.58,
        est_rows: 9990.0,
        act_rows: 0,
        access_table: 'access_table',
        access_index: 'access_index',
        access_partition: 'access_partition',
        time_us: 200.6,
        run_at: 'root',
        children: [
          {
            name: 'Selection_14',
            cost: 600020.0,
            est_rows: 9990.0,
            act_rows: 0,
            access_table: 'access_table',
            access_index: 'access_index',
            access_partition: 'access_partition',
            time_us: 100,
            run_at: 'cop[tikv]',
            children: [
              {
                name: 'TableFullScan_13',
                est_rows: 10000.0,
                cost: 570020.0,
                act_rows: 0,
                access_table: 'access_table',
                access_index: 'access_index',
                access_partition: 'access_partition',
                time_us: 98,
                run_at: 'cop[tikv]',
              },
            ],
          },
        ],
      },
    ],
  },
  with_runtime_stats: true,
}

export default vpData
