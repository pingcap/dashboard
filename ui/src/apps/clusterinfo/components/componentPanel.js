import { Col, Row } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './componentPanel.module.less';
import aliveDeadCnt from './utils';

function ComponentPanel(props) {
  const { t } = useTranslation();
  const [alive_cnt, down_cnt] = aliveDeadCnt(props.datas);
  return (
    <div>
      <h3>
        {props.name} {t('clusterInfo.status.nodes')}
      </h3>

      <Row gutter={[16, 16]}>
        <Col span={8} className={styles.column}>
          <p className={styles.desc}>{t('clusterInfo.status.up')}</p>
          <p className={styles.alive}>{alive_cnt}</p>
        </Col>

        <Col span={8} className={styles.column}>
          <p className={styles.desc}>{t('clusterInfo.status.abnormal')}</p>
          <p className={down_cnt === 0 ? styles.alive : styles.down}>
            {down_cnt}
          </p>
        </Col>
      </Row>
    </div>
  );
}

export default ComponentPanel;
