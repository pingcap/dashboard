import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import * as Database from '@lib/utils/xcClient/database'
import { Table, Button, Modal, Form, Input, notification } from 'antd'
import { Card } from '@lib/components'
import { useTranslation } from 'react-i18next'

// route: /data
export default function DatabaseList() {
  const [dbList, setDbList] = useState<Object[]>([])
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [deleteDBName, setDeleteDBName] = useState('')
  const { t } = useTranslation()

  async function fetchDatabaseList() {
    const result = (await Database.getDatabases()).databases
    let objArr: Object[] = []

    result.map((data, idx) => {
      const itemToObj = {}
      itemToObj['database_name'] = data
      itemToObj['key'] = idx
      objArr.push(itemToObj)
    })

    setDbList(objArr)
  }

  useEffect(() => {
    fetchDatabaseList()
  }, [])

  const openNotificationWithIcon = (type, title, error) => {
    notification[type]({
      message: title,
      description: error.message,
    })
  }

  const handleDelete = (dbName) => {
    setDeleteDBName(dbName)
    setDeleteModalVisible(true)
  }

  const DeleteDBModal = () => {
    async function deleteDatabase(deleteDBName) {
      try {
        await Database.dropDatabase(deleteDBName)
        fetchDatabaseList()
        openNotificationWithIcon(
          'success',
          `${t('data_manager.delete_success_txt')}`,
          ''
        )
      } catch (error) {
        openNotificationWithIcon(
          'error',
          `${t('data_manager.delete_failed_txt')}`,
          error
        )
      }

      setDeleteModalVisible(false)
    }

    function handleOK() {
      deleteDatabase(deleteDBName)
      setDeleteModalVisible(true)
    }

    function handleCancel() {
      setDeleteModalVisible(false)
    }

    return (
      <Modal
        title={t('data_manager.delete_db_title')}
        visible={deleteModalVisible}
        onOk={handleOK}
        onCancel={handleCancel}
        cancelText={t('data_manager.cancel')}
        okText={t('data_manager.delete')}
        closable
      >
        <p>
          {t('data_manager.confirm_delete_txt')}{' '}
          <span style={{ fontWeight: 'bold' }}>{deleteDBName}</span>
        </p>
      </Modal>
    )
  }

  const CreateDBModal = () => {
    const onFinish = (values) => {
      async function handleCreateDB() {
        try {
          await Database.createDatabase(values.database_name)
          fetchDatabaseList()
          openNotificationWithIcon(
            'success',
            `${t('data_manager.create_success_txt')}`,
            ''
          )
        } catch (error) {
          openNotificationWithIcon(
            'error',
            `${t('data_manager.create_failed_txt')}`,
            error
          )
        }

        setCreateModalVisible(false)
      }

      handleCreateDB()
    }

    const oncancel = () => {
      setCreateModalVisible(false)
    }

    return (
      <Modal
        title={t('data_manager.create_db')}
        visible={createModalVisible}
        closable
        onCancel={oncancel}
        cancelText={t('data_manager.cancel')}
        okText={t('data_manager.submit')}
        footer={null}
      >
        <Form onFinish={onFinish}>
          <Form.Item
            label={t('data_manager.db_name_input')}
            name="database_name"
            rules={[{ required: true, message: 'Please input database name!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label=" " colon={false}>
            <Button type="primary" htmlType="submit">
              {t('data_manager.submit')}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    )
  }

  const columns = [
    {
      title: t('data_manager.db_name_column'),
      key: 'name',
      dataIndex: 'database_name',
      minWidth: 100,
      render: (database) => (
        <Link to={`/data/tables?db=${database}`}> {database} </Link>
      ),
    },
    {
      title: t('data_manager.action'),
      key: 'action',
      render: (database) => (
        <a onClick={() => handleDelete(database.database_name)}>
          {t('data_manager.delete')}
        </a>
      ),
    },
  ]

  return (
    <Card>
      <Button
        type="primary"
        style={{ marginBottom: `2rem` }}
        onClick={() => setCreateModalVisible(true)}
      >
        {t('data_manager.create_db')}
      </Button>
      <DeleteDBModal />
      <CreateDBModal />
      <Table dataSource={dbList} columns={columns} />
    </Card>
  )
}
