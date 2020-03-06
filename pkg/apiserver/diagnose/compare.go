package diagnose

import (
	"container/heap"
	"fmt"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/dbstore"
	"math"
	"sort"
	"strconv"
	"strings"
	"sync"

	"github.com/jinzhu/gorm"
	"github.com/pingcap/errors"
)

func GetCompareReportTablesForDisplay(startTime1, endTime1, startTime2, endTime2 string, db *gorm.DB, sqliteDB *dbstore.DB, reportID uint) []*TableDef {
	var errRows []TableRowDef
	var resultTables []*TableDef
	resultTables = append(resultTables, GetCompareHeaderTimeTable(startTime1, endTime1, startTime2, endTime2))
	var tables0, tables1, tables2, tables3, tables4 []*TableDef
	var errRows0, errRows1, errRows2, errRows3, errRows4 []TableRowDef
	var wg sync.WaitGroup
	wg.Add(5)
	var progress int32
	totalTableCount := 61
	go func() {
		// Get Header tables.
		tables0, errRows0 = GetReportHeaderTables(startTime2, endTime2, db, sqliteDB, reportID, &progress, totalTableCount)
		errRows = append(errRows, errRows0...)
		wg.Done()
	}()
	go func() {
		// Get tables in 2 ranges
		tables1, errRows1 = GetReportTablesIn2Range(startTime1, endTime1, startTime2, endTime2, db, sqliteDB, reportID, &progress, totalTableCount)
		errRows = append(errRows, errRows1...)
		wg.Done()
	}()
	go func() {
		// Get compare refer tables
		tables2, errRows2 = getCompareTables(startTime1, endTime1, db, sqliteDB, reportID, &progress, totalTableCount)
		errRows = append(errRows, errRows2...)
		wg.Done()
	}()

	go func() {
		// Get compare tables
		tables3, errRows3 = getCompareTables(startTime2, endTime2, db.New(), sqliteDB, reportID, &progress, totalTableCount)
		errRows = append(errRows, errRows3...)
		wg.Done()
	}()

	go func() {
		// Get end tables
		tables4, errRows4 = GetReportEndTables(startTime2, endTime2, db, sqliteDB, reportID, &progress, totalTableCount)
		errRows = append(errRows, errRows4...)
		wg.Done()
	}()
	wg.Wait()

	tables, errs := CompareTables(tables2, tables3)
	errRows = append(errRows, errs...)
	resultTables = append(resultTables, tables0...)
	resultTables = append(resultTables, tables1...)
	resultTables = append(resultTables, tables...)
	resultTables = append(resultTables, tables4...)

	if len(errRows) > 0 {
		resultTables = append(resultTables, GenerateReportError(errRows))
	}
	return resultTables
}

func CompareTables(tables1, tables2 []*TableDef) ([]*TableDef, []TableRowDef) {
	var errRows []TableRowDef
	dr := &diffRows{}
	resultTables := make([]*TableDef, 1, len(tables1))
	for _, tbl1 := range tables1 {
		for _, tbl2 := range tables2 {
			if strings.Join(tbl1.Category, ",") == strings.Join(tbl2.Category, ",") &&
				tbl1.Title == tbl2.Title {
				table, err := compareTable(tbl1, tbl2, dr)
				if err != nil {
					errRows = appendErrorRow(*tbl1, err, errRows)
				} else if table != nil {
					resultTables = append(resultTables, table)
				}
			}
		}
	}
	resultTables[0] = GenerateDiffTable(*dr)
	return resultTables, errRows
}

func GenerateDiffTable(dr diffRows) *TableDef {
	l := dr.Len()
	rows := make([]TableRowDef, 0, l)
	labels := make(map[string]struct{}, l)
	for dr.Len() > 0 {
		row := heap.Pop(&dr).(diffRow)
		if _, ok := labels[row.label]; ok {
			continue
		}
		labels[row.label] = struct{}{}
		rows = append(rows, TableRowDef{
			Values: []string{
				row.label,
				strconv.FormatFloat(row.ratio, 'f', -1, 64),
			},
		})
	}
	return &TableDef{
		Category:  []string{CategoryOverview},
		Title:     "Max diff item",
		CommentEN: "",
		CommentCN: "",
		Column:    []string{"NAME", "MAX_DIFF"},
		Rows:      rows,
	}
}

func compareTable(table1, table2 *TableDef, dr *diffRows) (*TableDef, error) {
	labelsMap1, err := getTableLablesMap(table1)
	if err != nil {
		return nil, err
	}
	labelsMap2, err := getTableLablesMap(table2)
	if err != nil {
		return nil, err
	}

	resultRows := make([]TableRowDef, 0, len(table1.Rows))
	for i := range table1.Rows {
		label1 := genRowLabel(table1.Rows[i].Values, table1.joinColumns)
		row2, ok := labelsMap2[label1]
		if !ok {
			row2 = &TableRowDef{}
		}
		newRow, err := joinRow(&table1.Rows[i], row2, table1, dr)
		if err != nil {
			return nil, err
		}
		resultRows = append(resultRows, *newRow)
	}
	for i := range table2.Rows {
		label2 := genRowLabel(table2.Rows[i].Values, table2.joinColumns)
		_, ok := labelsMap1[label2]
		if ok {
			continue
		}
		row1 := &TableRowDef{}
		newRow, err := joinRow(row1, &table2.Rows[i], table1, dr)
		if err != nil {
			return nil, err
		}
		resultRows = append(resultRows, *newRow)
	}

	resultTable := &TableDef{
		Category:       table1.Category,
		Title:          table1.Title,
		CommentEN:      table1.CommentEN,
		CommentCN:      table1.CommentCN,
		joinColumns:    nil,
		compareColumns: nil,
	}
	columns := make([]string, 0, len(table1.Column)*2-len(table1.joinColumns))
	for i := range table1.Column {
		if checkIn(i, table1.joinColumns) {
			columns = append(columns, table1.Column[i])
		} else {
			columns = append(columns, "t1."+table1.Column[i])
		}
	}
	columns = append(columns, "DIFF_RATIO")
	for i := range table2.Column {
		if !checkIn(i, table2.joinColumns) {
			columns = append(columns, "t2."+table2.Column[i])
		}
	}
	sort.Slice(resultRows, func(i, j int) bool {
		return resultRows[i].ratio > resultRows[j].ratio
	})
	if len(table1.compareColumns) > 0 {
		comment := "\nDIFF_RATIO = max( "
		for i, idx := range table1.compareColumns {
			if i > 0 {
				comment += " , "
			}
			comment = comment + fmt.Sprintf("(t2.%[1]s-t1.%[1]s)/max(t2.%[1]s, t1.%[1]s)", table1.Column[idx])
		}
		comment += " )"
		resultTable.CommentEN += comment
	}

	resultTable.Column = columns
	resultTable.Rows = resultRows
	return resultTable, nil
}

func joinRow(row1, row2 *TableRowDef, table *TableDef, dr *diffRows) (*TableRowDef, error) {
	rowsMap1, err := genRowsLablesMap(table, row1.SubValues)
	if err != nil {
		return nil, err
	}
	rowsMap2, err := genRowsLablesMap(table, row2.SubValues)
	if err != nil {
		return nil, err
	}

	subJoinRows := make([]*newJoinRow, 0, len(row1.SubValues))
	for _, subRow1 := range row1.SubValues {
		label := genRowLabel(subRow1, table.joinColumns)
		subRow2 := rowsMap2[label]
		ratio, err := calculateDiffRatio(subRow1, subRow2, table)
		if err != nil {
			return nil, errors.Errorf("category %v,table %v, calculate diff ratio error: %v,  %v,%v", strings.Join(table.Category, ","), table.Title, err.Error(), subRow1, subRow2)
		}
		subJoinRows = append(subJoinRows, &newJoinRow{
			row1:  subRow1,
			row2:  subRow2,
			ratio: ratio,
		})
		dr.appendRow(diffRow{label, ratio})
	}

	for _, subRow2 := range row2.SubValues {
		label := genRowLabel(subRow2, table.joinColumns)
		subRow1, ok := rowsMap1[label]
		if ok {
			continue
		}
		ratio, err := calculateDiffRatio(subRow1, subRow2, table)
		if err != nil {
			return nil, errors.Errorf("category %v,table %v, calculate diff ratio error: %v,  %v,%v", strings.Join(table.Category, ","), table.Title, err.Error(), subRow1, subRow2)
		}

		subJoinRows = append(subJoinRows, &newJoinRow{
			row1:  subRow1,
			row2:  subRow2,
			ratio: ratio,
		})
		dr.appendRow(diffRow{label, ratio})
	}

	sort.Slice(subJoinRows, func(i, j int) bool {
		return subJoinRows[i].ratio > subJoinRows[j].ratio
	})
	totalRatio := float64(0)
	resultSubRows := make([][]string, 0, len(row1.SubValues))
	for _, r := range subJoinRows {
		totalRatio += r.ratio
		resultSubRows = append(resultSubRows, r.genNewRow(table))
	}

	// row join with null row
	if len(subJoinRows) == 0 {
		if len(row1.Values) != len(row2.Values) {
			totalRatio = 1
		} else {
			totalRatio, err = calculateDiffRatio(row1.Values, row2.Values, table)
			if err != nil {
				return nil, errors.Errorf("category %v,table %v, calculate diff ratio error: %v,  %v,%v", strings.Join(table.Category, ","), table.Title, err.Error(), row1.Values, row2.Values)
			}
		}
		label := ""
		if len(row1.Values) >= len(table.Column) {
			label = genRowLabel(row1.Values, table.joinColumns)
		} else if len(row2.Values) >= len(table.Column) {
			label = genRowLabel(row2.Values, table.joinColumns)
		}
		if len(label) > 0 {
			dr.appendRow(diffRow{label, totalRatio})
		}
	}

	resultJoinRow := newJoinRow{
		row1:  row1.Values,
		row2:  row2.Values,
		ratio: totalRatio,
	}

	resultRow := &TableRowDef{
		Values:    resultJoinRow.genNewRow(table),
		SubValues: resultSubRows,
		ratio:     totalRatio,
		Comment:   "",
	}
	return resultRow, nil
}

type diffRow struct {
	label string
	ratio float64
}

type diffRows []diffRow

func (r diffRows) Len() int           { return len(r) }
func (r diffRows) Less(i, j int) bool { return math.Abs(r[i].ratio) < math.Abs(r[j].ratio) }
func (r diffRows) Swap(i, j int)      { r[i], r[j] = r[j], r[i] }

func (r *diffRows) Push(x interface{}) {
	*r = append(*r, x.(diffRow))
}

func (r *diffRows) Pop() interface{} {
	old := *r
	n := len(old)
	x := old[n-1]
	*r = old[0 : n-1]
	return x
}

func (r *diffRows) appendRow(row diffRow) {
	heap.Push(r, row)
	if r.Len() > 150 {
		heap.Pop(r)
	}
}

type newJoinRow struct {
	row1  []string
	row2  []string
	ratio float64
}

func (r *newJoinRow) genNewRow(table *TableDef) []string {
	newRow := make([]string, 0, len(r.row1)+len(r.row2))
	ratio := convertFloatToString(r.ratio)
	if len(r.row1) == 0 {
		newRow = append(newRow, make([]string, len(r.row2))...)
		newRow = append(newRow, ratio)
		for i := range r.row2 {
			if checkIn(i, table.joinColumns) {
				newRow[i] = r.row2[i]
			} else {
				newRow = append(newRow, r.row2[i])
			}
		}
		return newRow
	}

	newRow = append(newRow, r.row1...)
	newRow = append(newRow, ratio)
	if len(r.row2) == 0 {
		newRow = append(newRow, make([]string, len(r.row1)-len(table.joinColumns))...)
		return newRow
	}
	for i := range r.row2 {
		if !checkIn(i, table.joinColumns) {
			newRow = append(newRow, r.row2[i])
		}
	}
	return newRow
}

func calculateDiffRatio(row1, row2 []string, table *TableDef) (float64, error) {
	if len(table.compareColumns) == 0 {
		return 0, nil
	}
	if len(row1) == 0 && len(row2) == 0 {
		return 0, nil
	}
	if len(row1) == 0 || len(row2) == 0 {
		return float64(1), nil
	}
	maxRatio := float64(0)
	for _, idx := range table.compareColumns {
		f1, err := parseFloat(row1[idx])
		if err != nil {
			return 0, err
		}
		f2, err := parseFloat(row2[idx])
		if err != nil {
			return 0, err
		}
		if f1 == f2 {
			continue
		}
		ratio := (f2 - f1) / math.Max(f1, f2)
		if math.Abs(ratio) > math.Abs(maxRatio) {
			maxRatio = ratio
		}
	}
	return maxRatio, nil
}

func parseFloat(s string) (float64, error) {
	if len(s) == 0 {
		return float64(0), nil
	}
	ratio := float64(1)
	if strings.HasSuffix(s, " MB") {
		ratio = 1024 * 1024
		s = s[:len(s)-3]
	} else if strings.HasSuffix(s, " KB") {
		ratio = 1024
		s = s[:len(s)-3]
	} else if strings.HasSuffix(s, "%") {
		s = s[:len(s)-1]
	}

	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0, err
	}
	return f * ratio, nil
}

func checkIn(idx int, idxs []int) bool {
	for _, i := range idxs {
		if i == idx {
			return true
		}
	}
	return false
}

func genRowLabel(row []string, joinColumns []int) string {
	label := ""
	for i, idx := range joinColumns {
		if i > 0 {
			label += ","
		}
		label += row[idx]
	}
	return label
}

func genRowsLablesMap(table *TableDef, rows [][]string) (map[string][]string, error) {
	labelsMap := make(map[string][]string, len(rows))
	for i := range rows {
		label := genRowLabel(rows[i], table.joinColumns)
		_, ok := labelsMap[label]
		if ok {
			return nil, errors.Errorf("category %v,table %v has duplicate join label: %v", strings.Join(table.Category, ","), table.Title, label)
		}
		labelsMap[label] = rows[i]
	}
	return labelsMap, nil
}

func getTableLablesMap(table *TableDef) (map[string]*TableRowDef, error) {
	if len(table.joinColumns) == 0 {
		return nil, errors.Errorf("category %v,table %v doesn't have join columns", strings.Join(table.Category, ","), table.Title)
	}
	labelsMap := make(map[string]*TableRowDef, len(table.Rows))
	for i := range table.Rows {
		label := genRowLabel(table.Rows[i].Values, table.joinColumns)
		_, ok := labelsMap[label]
		if ok {
			return nil, errors.Errorf("category %v,table %v has duplicate join label: %v", strings.Join(table.Category, ","), table.Title, label)
		}
		labelsMap[label] = &table.Rows[i]
	}
	return labelsMap, nil
}

func getCompareTables(startTime, endTime string, db *gorm.DB, sqliteDB *dbstore.DB, reportID uint, progress *int32, totalTableCount int) ([]*TableDef, []TableRowDef) {
	funcs := []getTableFunc{
		//Node
		GetLoadTable,
		GetCPUUsageTable,
		GetTiKVThreadCPUTable,
		GetGoroutinesCountTable,

		// Overview
		GetTotalTimeConsumeTable,
		GetTotalErrorTable,

		// TiDB
		GetTiDBTimeConsumeTable,
		GetTiDBTxnTableData,
		GetTiDBDDLOwner,

		// PD
		GetPDTimeConsumeTable,
		GetPDSchedulerInfo,
		GetPDClusterStatusTable,
		GetStoreStatusTable,
		GetPDEtcdStatusTable,

		// TiKV
		GetTiKVTotalTimeConsumeTable,
		GetTiKVErrorTable,
		GetTiKVStoreInfo,
		GetTiKVRegionSizeInfo,
		GetTiKVCopInfo,
		GetTiKVSchedulerInfo,
		GetTiKVRaftInfo,
		GetTiKVSnapshotInfo,
		GetTiKVGCInfo,
		GetTiKVTaskInfo,
		GetTiKVCacheHitTable,
	}
	return getTablesParallel(startTime, endTime, db, funcs, sqliteDB, reportID, progress, totalTableCount)
}

func GetReportHeaderTables(startTime, endTime string, db *gorm.DB, sqliteDB *dbstore.DB, reportID uint, progress *int32, totalTableCount int) ([]*TableDef, []TableRowDef) {
	funcs := []func(string, string, *gorm.DB) (TableDef, error){
		// Header
		GetClusterHardwareInfoTable,
		GetClusterInfoTable,
	}
	return getTablesParallel(startTime, endTime, db, funcs, sqliteDB, reportID, progress, totalTableCount)
}

func GetReportEndTables(startTime, endTime string, db *gorm.DB, sqliteDB *dbstore.DB, reportID uint, progress *int32, totalTableCount int) ([]*TableDef, []TableRowDef) {
	funcs := []func(string, string, *gorm.DB) (TableDef, error){
		GetTiDBCurrentConfig,
		GetPDCurrentConfig,
		GetTiKVCurrentConfig,
	}
	return getTablesParallel(startTime, endTime, db, funcs, sqliteDB, reportID, progress, totalTableCount)
}

func GetCompareHeaderTimeTable(startTime1, endTime1, startTime2, endTime2 string) *TableDef {
	return &TableDef{
		Category:  []string{CategoryHeader},
		Title:     "Compare Report Time Range",
		CommentEN: "",
		CommentCN: "",
		Column:    []string{"T1.START_TIME", "T1.END_TIME", "T2.START_TIME", "T2.END_TIME"},
		Rows: []TableRowDef{
			{Values: []string{startTime1, endTime1, startTime2, endTime2}},
		},
	}
}

func GetReportTablesIn2Range(startTime1, endTime1, startTime2, endTime2 string, db *gorm.DB, sqliteDB *dbstore.DB, reportID uint, progress *int32, totalTableCount int) ([]*TableDef, []TableRowDef) {
	funcs := []func(string, string, *gorm.DB) (TableDef, error){
		// Diagnose
		GetDiagnoseReport,
		// Config
		GetPDConfigInfo,
		GetTiDBGCConfigInfo,
	}

	tables := make([]*TableDef, 0, len(funcs))
	var errRows []TableRowDef

	var tables1, tables2 []*TableDef
	var errRows1, errRows2 []TableRowDef
	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		tables1, errRows1 = getTablesParallel(startTime1, endTime1, db, funcs, sqliteDB, reportID, progress, totalTableCount)
		errRows = append(errRows, errRows1...)
		for _, tbl := range tables1 {
			if tbl.Rows != nil {
				tbl.Title += " in time range t1"
			}
		}
		wg.Done()
	}()
	go func() {
		tables2, errRows2 = getTablesParallel(startTime2, endTime2, db, funcs, sqliteDB, reportID, progress, totalTableCount)
		errRows = append(errRows, errRows2...)
		for _, tbl := range tables2 {
			if tbl.Rows != nil {
				tbl.Title += " in time range t2"
			}
		}
		wg.Done()
	}()
	wg.Wait()

	for len(tables1) > 0 && len(tables2) > 0 {
		tables = append(tables, tables1[0])
		tables = append(tables, tables2[0])
		tables1 = tables1[1:]
		tables2 = tables2[1:]
	}
	tables = append(tables, tables1...)
	tables = append(tables, tables2...)
	return tables, errRows
}

func appendErrorRow(tbl TableDef, err error, errRows []TableRowDef) []TableRowDef {
	if err == nil {
		return errRows
	}
	category := ""
	if tbl.Category != nil {
		category = strings.Join(tbl.Category, ",")
	}
	errRows = append(errRows, TableRowDef{Values: []string{category, tbl.Title, err.Error()}})
	return errRows
}
