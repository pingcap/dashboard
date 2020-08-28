import { Root } from '@lib/components'
import React from 'react'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'
import DatabaseList from './pages/DatabaseList'
import DBTableList from './pages/DBTableList'
import CreateTable from './pages/CreateTable'
import DBTableDetail from './pages/DBTableDetail'
import DBTableStructure from './pages/DBTableStructure'
import TableDataView from './pages/TableDataView'
import ExportTables from './pages/ExportTables'
import DumpTables from './pages/DumpTables'

const App = () => {
  return (
    <Root>
      <Router>
        <Routes>
          <Route path="/data" element={<DatabaseList />} />
          <Route path="/data/view" element={<TableDataView />} />
          <Route path="/data/export" element={<ExportTables />} />
          <Route path="/data/dump" element={<DumpTables />} />
          <Route path="/data/tables" element={<DBTableList />} />
          <Route path="/data/tables/create" element={<CreateTable />} />
          <Route path="/data/table_detail" element={<DBTableDetail />} />
          <Route path="/data/table_structure" element={<DBTableStructure />} />
        </Routes>
      </Router>
    </Root>
  )
}

export default App
