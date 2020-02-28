import React from 'react';
import {Icon} from 'antd';
import styles from './monitor_alert_bar.module.less';

export default class MonitorAlertBar extends React.Component {
  render() {
    let grafana = '';
    let am = '';
    const data = this.props.data;
    if (data.alert_manager !== null && data.alert_manager.err === null) {
      am = 'http://' + data.alert_manager.ip + ':' + data.alert_manager.port;
    }
    if (data.grafana !== null && data.grafana.err === null) {
      grafana = 'http://' + data.grafana.ip + ':' + data.grafana.port;
    }
    return (
      <div className={styles.desc}>
        <h2>MONITOR AND ALERT</h2>
        <a href={grafana}>
          <p>View Monitor <Icon type="right" style={{ marginLeft: '5px' }} /> </p>
        </a>
        <a href={am} className={styles.warn}>
          <p>View 5 Alerts <Icon type="right" style={{ marginLeft: '5px' }} /> </p>
        </a>

        <h2>PROBLEMS</h2>
        <a href={""}>
          <p>Run Diagnose <Icon type="right" style={{ marginLeft: '5px' }} /> </p>
        </a>
      </div>
    );
  }
}
