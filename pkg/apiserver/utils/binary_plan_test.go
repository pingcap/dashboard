// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package utils

import (
	"fmt"
	"strings"
	"testing"

	"github.com/bitly/go-simplejson"
	"github.com/stretchr/testify/assert"
)

var bpTestStr = "SiwKRgoGU2hvd18yKQAFAYjwPzAFOAFAAWoVdGltZTozNC44wrVzLCBsb29wczoygAH//w0COAGIAf///////////wEYAQ=="

func TestGenerateBinaryPlan(t *testing.T) {
	_, err := GenerateBinaryPlan(bpTestStr)
	if err != nil {
		t.Fatalf("generate Visual plan failed: %v", err)
	}
}

func TestGenerateBinaryPlanJson(t *testing.T) {
	_, err := GenerateBinaryPlanJSON(bpTestStr)
	if err != nil {
		t.Fatalf("generate Visual plan failed: %v", err)
	}
}

func TestUseComparisonOperator(t *testing.T) {
	assert.True(t, useComparisonOperator("eq(test.t.a, 1)"))
	assert.False(t, useComparisonOperator("eq(minus(test.t1.b, 1), 1)"))
	assert.True(t, useComparisonOperator("eq(test.t.a, 1), eq(test.t.a, 2)"))
	assert.False(t, useComparisonOperator("eq(test.t.a, 1), eq(test.t.b, 1)"))
	assert.True(t, useComparisonOperator("in(test.t.a, 1, 2, 3, 4)"))
	assert.False(t, useComparisonOperator("in(test.t.a, 1, 2, 3, 4), in(test.t.b, 1, 2, 3, 4)"))
	assert.False(t, useComparisonOperator("in(test.t.a, 1, 2, 3, 4, test.t.b)"))
	assert.True(t, useComparisonOperator("isnull(test2.t1.a)"))
	assert.True(t, useComparisonOperator("not(isnull(test2.t1.a))"))
	assert.False(t, useComparisonOperator("eq(test2.t1.a, test2.t2.a)"))
	assert.True(t, useComparisonOperator("eq(1, test2.t2.a)"))
	assert.False(t, useComparisonOperator("in(test.t.a, 1, 2, test.t.b, 4)"))
	assert.False(t, useComparisonOperator("in(test.t.a, 1, 2, 3, 4), eq(1, test2.t2.a), eq(test.t.a, 1), eq(test.t.a, 2), isnull(test2.t1.a)"))
	assert.True(t, useComparisonOperator("in(test.t.a, 1, 2, 3, 4), eq(1, test.t.a), eq(test.t.a, 1), eq(test.t.a, 2), isnull(test.t.a)"))
	assert.True(t, useComparisonOperator("not(isnull(test2.table1.a))"))
	assert.False(t, useComparisonOperator(`eq(information_schema.cluster_slow_query.conn_id, 4842609848539415539), eq(information_schema.cluster_slow_query.digest, "6e88a1c8f7bfb008e6ead01c1ad9e47922c145e95a3a037381ac8a088e25e60b")`))
	assert.True(t, useComparisonOperator("lt(imdbload.movie_info.movie_id, 1000)"))
}

func TestFormatJSON(t *testing.T) {
	_, err := formatJSON(`tikv_task:{time:0s, loops:1}, scan_detail: {total_process_keys: 8, total_process_keys_size: 360, total_keys: 9, rocksdb: {delete_skipped_count: 0, key_skipped_count: 8, block: {cache_hit_count: 1, read_count: 0, read_byte: 0 Bytes}}}`)

	assert.Nil(t, err)
}

func TestTooLong(t *testing.T) {
	bp := "AgQgAQ=="
	vp, err := GenerateBinaryPlanJSON(bp)
	assert.Nil(t, err)
	vpJSON, err := simplejson.NewJson([]byte(vp))
	assert.Nil(t, err)

	assert.True(t, vpJSON.Get("discardedDueToTooLong").MustBool())
}

func TestBinaryPlanIsNil(t *testing.T) {
	vp, err := GenerateBinaryPlanJSON("")
	assert.Nil(t, err)
	assert.Len(t, vp, 0)
}

func TestLargeEstimatedBias(t *testing.T) {
	vp, err := GenerateBinaryPlanJSON("1gmQCtEJCgdMaW1pdF84Eu0ICg5UYWJsZVJlYWRlcl8xMxKpBgoITAUfXDEyEpsDCgxTZWxlY3Rpb25fMTESxwEKEAUx8IZGdWxsU2Nhbl8xMCHw694zF1ZHQSlZHdfaNxuEQDDTuA44AkACShUKEwoIaW1kYmxvYWQSB2tleXdvcmRSEGtlZXAgb3JkZXI6ZmFsc2VqWnRpa3ZfdGFzazp7cHJvYyBtYXg6MjAxbXMsIG1pbjowcywgYXZnOiAxMDAuNW1zLCBwODA6MjAFIRRwOTU6MjAFC1BpdGVyczoyMzcsIHRhc2tzOjJ9cP8RAQQBeBEKLP8BIUc/mTzKe0dBKQUUCD9/QAGxJFI7Z3QoY2FzdCgRtQAuDbSQLnBob25ldGljX2NvZGUsIGRvdWJsZSBCSU5BUlkpLCAyMClqWFLFABA2Mm1zLDrFAAAzBa0AcAHDCR8FwwkL/sMAWBNvZmZzZXQ6MCwgY291bnQ6NTAwar0CVpwAADNOnAAELjUBFgmeBSEJngULSp4AoCwgc2Nhbl9kZXRhaWw6IHt0b3RhbF9wcm9jZXNzX2tleXM6IDIzNjYyIZVCHABAX3NpemU6IDE0MzIzNTkxLCAJIx03bDksIHJvY2tzZGI6IHtkZWxldGVfc2tpcHBlZF8J4hggMCwga2V5PhYAADINdUBibG9jazoge2NhY2hlX2hpdBE3HDI3OCwgcmVhLkgABQ84Ynl0ZTogMCBCeXRlc319bkQCDHcjSEFZRCgBQAFSDWRhdGE6TG1ELFoVdGltZToyNzIuNyFXNGxvb3BzOjFi5AFjb3BfQaUkOiB7bnVtOiAyLEX2DCAyNjkpgiBtaW46IDIuODQBOCBhdmc6IDEzNi5FTwhwOTUuKQAIYXhfIXA5Ngw1OTYsASVOFwAIdG90BRcBQQWTAREUd2FpdDogJeMMcnBjXxGRAQwFwAAgAcEFexBjb3ByXyVLEDogZGlzgT4EZCwBClh0c3FsX2NvbmN1cnJlbmN5OiAxfXCFND51AyUxAAABAQhAf0AlMU6yAlo3AVbNAwQYAQ==")
	assert.Nil(t, err)
	assert.True(t, strings.Contains(vp, LargeEstimatedBias))

	vp, err = GenerateBinaryPlanJSON("hgSICoEECgZTb3J0XzUSkQMKDkluZGV4TG9va1VwXzEzEs4BChEFE/BYUmFuZ2VTY2FuXzExGgEBIQAAAACAMQdBKauqqqqqCqpAOAJAAkovCi0KBW15c3FsEgliaW5kX2luZm8aGQoKdGltZV9pbmRleBILdXBkYXRlX3RpbWVSR3IBWBg6KDAwMDAtBQMMIDAwOgUDAC4BFPA8MDAsK2luZl0sIGtlZXAgb3JkZXI6ZmFsc2UsIHN0YXRzOnBzZXVkb1oQdGltZTowcywgbG9vcHM6MHD//w0CBAF4DQlA//8BEngKEVRhYmxlUm93SUQJ0AwyGgECWtAACBQKEkbQAARSHnaMAABwGW8deiQhGo2sqeLX+EApNTIQAUABWhMhGhQ6NDkuOHMRuwAxLjYAGE6nBf039Ao9aCwBQAFSOG15c3FsLmIxYwgudXA1VAQsID4dABBjcmVhdClxUnAABBgB")
	assert.Nil(t, err)
	assert.True(t, strings.Contains(vp, LargeEstimatedBias))
}

func TestUseDisk(t *testing.T) {
	vp, err := GenerateBinaryPlanJSON("6Q5ICuQOCglIYXNoQWdnXzgS8w0KCgEOdEpvaW5fORL6BQoOSW5kZXhSZWFkZXJfMTQSrQMKEAUTUEZ1bGxTY2FuXzEzIQAAAADndopBKQEJ8HmAhC5BMIAOOAJAAkonCiUKBHRlc3QSAnQxGhkKB1BSSU1BUlkSBnNfd19pZBIGc19pX2lkUhBrZWVwIG9yZGVyOmZhbHNlaq4CdGlrdl90YXNrOntwcm9jIG1heDoxbXMsIG1pbjowcywgYXZnOiA3NTDCtXMsIHA4MAkeCHA5NQkJUGl0ZXJzOjE0LCB0YXNrczo0fSwgcwGyiGRldGFpbDoge3RvdGFsX3Byb2Nlc3Nfa2V5czogMTc5MiwgRhoALF9zaXplOiA5NDk3NhEgDTK4ODEwLCByb2Nrc2RiOiB7ZGVsZXRlX3NraXBwZWRfY291bnQ6IDMyODgsIGtleV86GQBYNTE1MCwgYmxvY2s6IHtjYWNoZV9oaXQROBgxNywgcmVhFUgBawEPRGJ5dGU6IDAgQnl0ZXN9fX1w/xEBBAF4EQo0/wEaAQIhq6qqqjk/UkE9nhwIOAFAAVIWaSHcADo+zwFoWhN0aW1lOjcuMm1zLCBsb29wczoxYt8BY29wKY8kIHtudW06IDQsICGTECAyLjMzASogbWluOiAxLjM3AQ0lnAwxLjc5AQ0hkxknBGF4JXMtPgA5IW8IcDk1QhQACHRvdAUUBDogBV4BDxh3YWl0OiAxAVMMcnBjXxGGAQwFsxAgNy4wNQEeEGNvcHJfOUugcmF0aW86IDAuMDAsIGRpc3RzcWxfY29uY3VycmVuY3k6IDE1fXCShxM9OggSjgY6/QIIOBK1Rv0CADdF/Qhtc5A9XwjAhD1C/gIAMrb+Agi1AnRO/gIAOAHdIWhZ/wQuNQXyDHA4MDo1bAAxJTJxAAQzN3ECCDExNZIEAwwzODA4UeQuHgNtBBAyMDE4MmFXZT9pBQgzODZBmnoFAwQ0MWErSgUDEDgwMzUsZgUDBDIy9gUDIAEhVVVVVRq/VzqmAWYGAww3WhZ0YQYIMTcuRXBpBxA5ODJi5kIJAwwxMTUsaQsIMy4wBS4hoxQgNDEyLjSFnGUNEDYyOC4yBQ9lDwgxLjMpzjYPAxAyMDE2LAEiJXktXQAwJY0FEgg6IDVBBHkOZW5hAmUOBYsBDgW9DCA3MC4FL14QAwQ5NmoQAwztgPICfREgIYlXpqxvjrhCgUggopQabUIwgJB6JUNQFENBUlRFU0lBTiBpbm5lciBqb2luLUEQNTQuNnOVR1g5NTRihAFidWlsZF9oYXNoX3RhYmxlOqmKEDozNjAuRcUcZmV0Y2g6MjEJvgUvRDozMzkuM21zfSwgcHJvYmU6ey7BAwAxJSIQYWw6NTXBIQRheAkJCSoUNTQuN3MsDVUBZFQ4bXN9cOT51wd4gOy4CyHlutab7Ui7BdkQAABC+EAF1SQ1Z3JvdXAgYnk6wcFQLnN0b2NrLnNfaV9pZCwgZnVuY3M6pds8KDEpLT5Db2x1bW4jMzdaESV6BYcsbG9vcHM6MXD0URgB")
	assert.Nil(t, err)
	assert.True(t, strings.Contains(vp, UseDisk))
}

func TestAddIndex(t *testing.T) {
	vp, err := GenerateBinaryPlanJSON("zQeYCsgHCg1UYWJsZVJlYWRlcl83Ev8ECgtTZWxlY3Rpb25fNhLLAQoPBSLwfUZ1bGxTY2FuXzUhAADA0p/kTUIpAAAAgEhlfEEwiKmZDjgCQAJKGAoWCghpbWRibG9hZBIKbW92aWVfaW5mb1IQa2VlcCBvcmRlcjpmYWxzZWpbdGlrdl90YXNrOntwcm9jIG1heDo2NDVtcywgbWluOjBzLCBhdmc6IDQyMwEUGHA4MDo0ODYFCxA5NTo1NQULXGl0ZXJzOjI5MzY0LCB0YXNrczo2Nn1w/xEBBAF4EQpY/wEhAAC4xj7/TUIp3lAMtdp/qUAw7Q8BuBBSJmx0KBG3AC4ZthELKGQsIDEwMDApasoCUrUABDcyAZY2tQAMNDEuNwEWAbcENTEFIQW3BDg4ARZWtwCoLCBzY2FuX2RldGFpbDoge3RvdGFsX3Byb2Nlc3Nfa2V5czogMjk3NzQ5OAHuQh4ASF9zaXplOiAyNjU1OTgyODQ4LCAJJRk7sDUwNTAsIHJvY2tzZGI6IHtkZWxldGVfc2tpcHBlZF9jb3VudDogMCwga2V5XzoWAGgzMTUwMzIzMCwgYmxvY2s6IHtjYWNoZV9oaXQROSQ0NzgzNiwgcmVhLkwABQ84Ynl0ZTogMCBCeXRlc319XqQBGF15cUA6/w82pAEkAUABUhBkYXRhOl2dbFoTdGltZToyLjQxcywgbG9vcHM6M2LlAWNvcF9BCig6IHtudW06IDY2LEVcFCA3MDMuNiF+IaoQIDEuMTEBDUlkBDU3La8EOTUBMgg4LjQBHAhtYXglfy1BGDcyMjA3NCwhyS4XABA1NjQ0NimRBRcIOiAzQb0wdG90X3dhaXQ6IDE3MAFODHJwY18VkgENBcAwIDMwLjJzLCBjb3ByXyVREDogZGlzYZcEZCwBCpR0c3FsX2NvbmN1cnJlbmN5OiAxNX1w/r0DeP///////////wEYAQ==")
	assert.Nil(t, err)
	assert.True(t, strings.Contains(vp, AddIndex))
}

func TestBadIndex(t *testing.T) {
	vp, err := GenerateBinaryPlanJSON("uA6YCrMOCg1JbmRleExvb2tVcF84EpYHCgtTZWxlY3Rpb25fNxLqAQoPBSLwQEZ1bGxTY2FuXzUhAACAxaCT8kEpAAAAABEGNEEwkYxQOAJAAko4CjYKCGltZGJsb2FkEghha2FfbmFtZRogChNhDQwwX2lkeF9wZXJzb24SCQkI8FhfaWRSEGtlZXAgb3JkZXI6ZmFsc2VqW3Rpa3ZfdGFzazp7cHJvYyBtYXg6NTA1bXMsIG1pbjowcywgYXZnOiAyMzguN21zLCBwODA6NTA1bXMsIHA5NTo1MAUsLGl0ZXJzOjEyOTIsIAFOFHM6M31w/xEBBAF4EQo8/wEaAQEpZ2ZmZtoEMEEwignTKFIsZ3QocGx1cyhpDdcELmENygQucAXGXF9pZCwgMSksIDEwKVoYdGltZToyNTUuNgGSDGxvb3ABfBw4NWLlAWNvcAnPJCB7bnVtOiAzLCAB0xQgNjI2LjcBLhxtaW46IDQuMAUNAGEF2ww5NC45ARsB0B0pUGF4X3Byb2Nfa2V5czogOTYwMDAwLAElThcACHRvdAUXEDogODQyAU0BERh3YWl0OiAzAQ8McnBjXxGRAQwFwwwgODg0CZZQY29wcl9jYWNoZTogZGlzYWJsZWQsAQpcdHNxbF9jb25jdXJyZW5jeTogMTV9ar8CUrgBADQljAHiADA1uAA1BekMcDgwOg0fAeYNC062AVAsIHNjYW5fZGV0YWlsOiB7dG90YWwF2whlc3MtDBwxMzEyMjczLAHlOh0AOF9zaXplOiA2MDM2NDU1OBEjKUQJOKA2LCByb2Nrc2RiOiB7ZGVsZXRlX3NraXBwZWRfY291bnQ6IDAsIGtleT4WAAk/KDMsIGJsb2NrOiB7JTEMX2hpdBE4HDkzMiwgcmVhLkkABQ84Ynl0ZTogMCBCeXRlc319WpwCFBK3BQoQVCF9EFJvd0lEZYoMNhoBAnmNProCEEoWChQKSo0DRmsDBFoVJfMQOC45cyxRswg0MjhKswIIMTU5TbUQMjQxLjFBPiHTCCAxLingRbUEODJJOSHOECAxOTEuRWY6tAIQMjAwMDNCswIQMTcyMjAlmSXXGDogMTEuN3MJEUmyADJFwkGnRbMFkQEOBcIYIDEzLjFzLL6zAgDGUrMCBDE5RZ8B4FWzBDY3adgUcDgwOjEwdZoIMTU2IQtNtBA5OTUsIIlqCDE1Oaa2AgQ2NgXpVrYCHDE0NjkxOTM4PrcCEDU4ODU0QVrStwIUOTIxMTU1arYCGDM4MTYxOTHuugIgIT4xsa60gddBNqICEAFAAVoWJbYQOS44NXNVeRgyODNijAFpwZWxLmnoBSxgIDkuNjhzLCBmZXRjaF9oYW5kbGU6IDM1NCmYOGJ1aWxkOiAzNjPCtXMsIEkzFDkuMzNzfSGTCGJsZVZUAAA1QfpFUQQ2OEE/LtQESH1wi/2MCHj///////////8BGAE=")
	assert.Nil(t, err)
	assert.True(t, strings.Contains(vp, BadIndex))
}

func TestBadIndexJoin(t *testing.T) {
	vp, err := GenerateBinaryPlanJSON("tQ+gCrAPCgxJbmRleEpvaW5fMTISjAYKDlRhYmxlUmVhZGVyXzE4ErUDChAFE/SoAUZ1bGxTY2FuXzE3IQAAwNKf5E1CKQAAAIBIZXxBMIipmQ44AkACShAKDgoIaW1kYmxvYWQSAm1pUhBrZWVwIG9yZGVyOmZhbHNlassCdGlrdl90YXNrOntwcm9jIG1heDo2MzVtcywgbWluOjJtcywgYXZnOiA0MzguNG1zLCBwODA6NDk0bXMsIHA5NTo1OTRtcywgaXRlcnM6MjkzNjQsIHRhc2tzOjY2fSwgc2Nhbl9kZXRhaWw6IHt0b3RhbF9wcm9jZXNzX2tleXM6IDI5Nzc0OTg0LCB0b3RhbF9wcm9jZXNzX2tleXNfc2l6ZTogMjY1NTk4Mjg0OCwgdG90YWxfa2V5czogMjk3NzUwNTAsIHJvY2tzZGI6IHtkZWxldGVfc2tpcHBlZF9jb3VudDogMCwga2V5X3NraXBwZWRfY291bnQ6IDMxNTAzMjMwLCBibG9jazoge2NhY2hlX2hpdF9jb3VudDogNDc4MzYsIHJlYWRfY291bnQ6IDAsIHJlYWRfYnl0ZTogMCBCeXRlc319fXD///////////8BeP//////AQ0sARoBASGpOPsATIYQPqYBJAFAAVIVZGF0YTo+2AEsWhl0aW1lOjc0Ni45IV4UbG9vcHM6JV5UYuABY29wX3Rhc2s6IHtudW06IDY2LCW4FCAxLjQycym5ECA1LjQzATsAYSG9BDcwKbsEOTUBJQQzNgElCGF4XyFrJWgwOiA3MjIwNzQsIHA5NS4XACg1NjQ0NjQsIHRvdAUXGDogMzcuOXMJEQx3YWl0AToBZwxycGNfFY0BDQXBWCA0Ni41cywgY29wcl9jYWNoZTogZGlzQdkEZCwBCmx0c3FsX2NvbmN1cnJlbmN5OiAxNX1wl4a/igR4IT8FARQBEqoGCg0lJG0PDDkSzwNtDhBSYW5nZWUPADhhBSQAAADwPzCP9gI4SgQDEGl0UkZyATBAOiBkZWNpZGVkIGJ5IFtpbWRlJSwubW92aWVfaW5mby4BBSBfdHlwZV9pZF1BPQhlcCAuOgMEuQJOOgMEMW0hWgxpbjowcTcMNjPCtWEqBDgwBRQhggUlAGltMAg1NjFxMCHfBDN9jjMDEDQ3ODg3JYQEYWwllwhlc3MlyAhfc2llMBQyNDcyMTIRIgBrZWgoNTI4NDksIHJvY2vGKgMYMjA5NzMsIGInAxgyODQzOTcsaRkcY291bnQ6IDANDxhieXRlOiAwgigDJAIhpOLsw2cYb0A2yQE6JwM98QRaF0VmFDM4LjFzLG0lGDU4OTIwYuNCJQMlXm0oEDc3NC43MasUIDQ0MC42JaYAYWEsCDEuMmU5IasAICWsOisDBDQzQicDADMlayWLEDogMi41QfRhM2kiCDIuOWFyYRZlIxQ1ODcyNSwFEAXAECAxbTEwzigDZR4BAQABfS0gIU4beDyqUxhCIUYAgNkUIUc0tAFpbm5lciBqb2luLCAFDIl8cVgsLCBvdXRlciBrZXk6fhcDDUE2LAAIaW5maThILmlkLCBlcXVhbCBjb25kOmVxKIpRAHGKLkcACClaGCUnBDI3PeccOTMwNDcwYmgJxAB7xRYQOjU5LjSFbplQBDMwaV9pXoGKKG5zdHJ1Y3Q6MTkuoS0cZmV0Y2g6NDAFXKxidWlsZDo4OS40bXN9LCBwcm9iZToyMS41c3CVm6wMeP///////////wEYAQ==")
	assert.Nil(t, err)
	assert.True(t, strings.Contains(vp, BadIndexJoin))
}

func TestPseudoCheck(t *testing.T) {
	vp, err := GenerateBinaryPlanJSON("nhHwdQqABQoLSGFzaEpvaW5fMjUSugEKDFNlbGVjdGlvbl8yNhJPCg5DVEVGdWxsU2Nhbl8yNykAAAAAAAAQQDAJOAFAAUoKGghDVEU6Y3RlMVIKZGF0YTpDVEVfMFoTdGltZTo2LjJtcywgbG9vcHM6M3DwCxoBASEFQRTQVUApmpkBAQAJDUt4Uhtub3QoaXNudWxsKHRlc3QyLnRhYmxlMS5hKSlaE0ZQABQycPgFeP8RAQgBErw2vQAIOBJQOr0AADkJvRRAv0AwAjg2vQAIMlIKFb0IMVoUDW0MMTZtcza+ACQCIVZVVVVllQBBCUwEALkNTF6+ABAyLmMpKRlRADgZUTq/ABghEQ7jWw+ZFVkMEEAwBgGlWFI2aW5uZXIgam9pbiwgZXF1YWw6W2VxOiIBBCwgPTIBdABdDXQMMTkuMx10NGKKAWJ1aWxkX2hhc2hfJWAoOnt0b3RhbDoxOC4FniRmZXRjaDo2LjI5ATgFLnw6MTIuNW1zfSwgcHJvYmU6e2NvbmN1cnJlbmN5OjUsIAlBBDk0ASUQLCBtYXgBdwAxAT8JMCAzMjIuNMK1cywNXUA5NC4ybXN9cNSNARKJBgoFQ0EzCBLFBS59AhwxMxLYBAoOVEEDNFJlYWRlcl8xNhLhAgoQBRMARlGTCDE1IUVRCHh+QC2TABRBUSACQAJKEQoPCgUlGAQSBgXruDFSHmtlZXAgb3JkZXI6ZmFsc2UsIHN0YXRzOnBzZXVkb2rrAXRpa3ZfdGFzazp7RQYFxwRsb0HBEDF9LCBzYQccZGV0YWlsOiApOjxfcHJvY2Vzc19rZXlzOiA5LRAyFwAkX3NpemU6IDQ3NxEeCS2oMTAsIHJvY2tzZGI6IHtkZWxldGVfc2tpcHBlZF9jb3VudDogMCwga2V5XzoWAEw5LCBibG9jazoge2NhY2hlX2hpdB0yCHJlYS5BAAUPQGJ5dGU6IDAgQnl0ZXN9fX1wcTwE/wF9SClPBKBDMk8BEAFAAVIVZSI+fgFRaAQuMl1oHDNijgFjb3BfJUgcIHtudW06IDFJGgwgMS40TRoAYy0FKTIlMAQ6ICVwDHJwY18RNQEMJYoMIDEuM2WREGNvcHJfGfVQcmF0aW86IDAuMDAsIGRpc3RzcWxfLqICGCAxNX1wmwMd5AgaAQMJ5wTQUhHnABBBNgHncocElRplHUkXADI2iARNhhVQRBFOb24tUmVjdXJzaXZlIENURU7NBKEdBBKKbQwAMT4MAwA4QgwDDDIxEuBCDAMEMjAF1ggwwS2NnwSIw4GfUgwDADKCDAMA6u4MA2kMADJR7i4jA20MCDEwNhEeaQwAM94LAwAy/gsDYgsDGKuqqqqqg/JNJClOQSROCwMEMjBNHgAxrTtJHggzYo9qCwNJ0SEeLQUpMiUwfgwDZXDSDAMEqAI6DAMB6AjKTvsN6PUhXgwDwWHd1WXQCe5SDAMZUEoMA3VSZdssbG9vcHM6M3DwCxgB")
	assert.Nil(t, err)
	assert.True(t, strings.Contains(vp, PseudoCheck))
}

func TestUseTiFlash(t *testing.T) {
	vp, err := GenerateBinaryPlanJSON("2hTwWArVFAoNUHJvamVjdGlvbl8xOBLAEgoIQXBwbHlfMjASvQUKCExpbWl0XzIzEtUECg5UYWJsZVJlYWRlcl8zMRKkAwoRRXhjaGFuZ2VTZW5kZXJfMzASlAIKETYUORKVAQoQBTZQRnVsbFNjYW5fMjghAAAAAIA17EApAQnwbQAAEEAwgIAEOARAA0oOCgwKBHRwY2gSBHBhcnRSEGtlZXAgb3JkZXI6ZmFsc2VqL3RpZmxhc2hfdGFzazp7dGltZTo0NTguMW1zLCBsb29wczoxLCB0aHJlYWRzOjF9cP///////////wF4////CQwAAUqDAAWBTFIRb2Zmc2V0OjAsIGNvdW50OjRq/nIAenIAABkxQkBUeXBlOiBQYXNzVGhyb3VnaP56ABF6GKuqqqqq3qI9bywEOAFAAVIWZGF0YToRfwBTMcEIWhV0JVUUOTEuM21zNVUQYj9jb3ApdnQge251bTogMSwgbWF4OiAwcywgcHJvY19rZXlzOiAlO0hwcl9jYWNoZTogZGlzYWJsZWR9VooBCBoBAWKhAEaNAVacAAAzVlsAHBKFDAoMU2VsTd4UMzISowsKTZtUMzUSvgoKDFN0cmVhbUFnZ181MhLPCTbiAhA1MxL8Bi4kABA0MRKqAy5TAAw1MRLPQuECKDUwIQCUrdq20pRCQeFIs7nhsUEwzM2bvAQ4AkACShIKEE3jIAhsaW5laXRlbUrnAhhjdGlrdl90ReQhXCVqNDQuMjVzLCBtaW46Mzc1IZwkYXZnOiA5MDUuOAEOGHA4MDoxLjIhj2A5NToxLjc2cywgaXRlcnM6MTE3MzA2OCwgAVMUczoyNjIwWpEBUCEAfLmpGNuUQimamZlRXJysQTChyw29EFIwZ3QoYZ8ALhG7CC5sX2GpEGtleSwgBRkBDgQucBEVCClqZFrJAAA3EckAOAW7CckIMjUuZcgNyR3KADjSygAQnFxPzeEphxwAAADwPzC8FCGEKFIuZnVuY3M6c3VtQs4AWHF1YW50aXR5KS0+Q29sdW1uIzI5at8CVsYABDMzDcYINDI5IYEJxgQ4Nmk5DcYBuymQADghvmaQAQgsIHOhIThkZXRhaWw6IHt0b3RhbF8h/ghlc3NtXSwxMjAwMDIzMjQ0LCBGIABEX3NpemU6IDIzODM4MTcyMDcyIfIFR2mcCT94NTg2NCwgcm9ja3NkYjoge2RlbGV0ZV9za2lwcGVkX4n5YcgIa2V5PhYACUIJgRxibG9jazoge2XqDF9oaXQROyQxNTEwNCwgcmVhFU4YMzg5NjI4MA0VOGJ5dGU6IDYxLjcgR0J9fV6LAhjN7KdUMEZWZUg1wYG7ABGFu3m+DDQxWhSFtggzbTdlASRsb29wczo4Yu0BPrYEQfuNuQg1LjVhImFQECA0MzEueVMIMS4wARohtxAgMi4zMSHnBGF4JYwtShg0Njc5NDgsASMyFwAQNTgzNTMlnAUXGDogNDVtMS5BKDR0b3Rfd2FpdDogMW0xNAWmDHJwY1+lSxA0NTg1LAUPBcYYIDFoMTZtMqFZAGNKSwVwLCBkaXN0c3FsX2NvbmN1cnJlbmN5OiAxNX1wpgMu5gYIzWyvOkABqfoAH3kAVeVd8QA3Uk0BEDRwyOIBjl4AQrcFADGttzadAQQxMla3BRgaAQIhzey2CbkEmpkBAQTpPw25GBBsdCgwLCARtQQ3KVKqAAw4cJwLLqkAGCLiTVUwRnZRRwQQQA1OUBRDQVJURVNJQU4gaW5uZXIgam9pbh1SgaRJSQwyYhpDPWsQT0ZGLCBF9gELPm4ABIJQUm4ABLMBSiEFNjYFDG5hbWU2EgAMbWZncjYSABBicmFuZDYTAAh0eXA6NwCBCDYkABxjb250YWluZTpOAAByhW0McHJpY0IwABBtbWVudFoOAQAPOg4BPHCYOnj///////////8BGAE=")

	fmt.Println(vp)
	assert.Nil(t, err)
	assert.True(t, strings.Contains(vp, UseTiFlash))
}

func TestCopTasksDuration(t *testing.T) {
	vp, err := GenerateBinaryPlanJSON("1QfICtAHCgxQcm9qZWN0aW9uXzUS2wYKBlNvcnRfNhKABgoNVGFibGVSZWFkZXJfORKsAwoPBRL0tgFGdWxsU2Nhbl84IQAAACAXuMBBKQAAAACAhC5BMMCEPTgCQAJKDwoNCgR0ZXN0EgVzdG9ja1IQa2VlcCBvcmRlcjpmYWxzZWrFAnRpa3ZfdGFzazp7cHJvYyBtYXg6NjFtcywgbWluOjBzLCBhdmc6IDE5LjNtcywgcDgwOjMwbXMsIHA5NTo0MW1zLCBpdGVyczoxNTQ2LCB0YXNrczoxNDZ9LCBzY2FuX2RldGFpbDoge3RvdGFsX3Byb2Nlc3Nfa2V5czogMTAwMDAwMCwgdG90YWxfcHJvY2Vzc19rZXlzX3NpemU6IDM3MDM0MzczMywgdG90YWxfa2V5czogMTAyNjM3NSwgcm9ja3NkYjoge2RlbGV0ZV9za2lwcGVkX2NvdW50OiAxNjY1Mywga2V5X3NraXBwZWRfY291bnQ6IDIwNjkzNTAsIGJsb2NrOiB7Y2FjaGVfaGl0X2NvdW50OiA3MTQ2LCByZWFkX2NvdW50OiAwLCByZWFkX2J5dGU6IDAgQnl0ZXN9fX1w////////////AXj///////////8BIVVVVTWsWYJBKQAAAACAhC5BJZskAUABUhRkYXRhOjrLAYBaF3RpbWU6NzI0LjhtcywgbG9vcHM6OTg1YucBY29wX3Qhpigge251bTogMTQ2LCWsECA2My42AS4gbWluOiAxLjEyAQ0cYXZnOiAyMi4FDSBwOTU6IDQ2LjcBGkxtYXhfcHJvY19rZXlzOiA5MTg0LAEiRhUACHRvdAUVHDogMi45N3MsBREYd2FpdDogMgVLDHJwY18ZjQEOBcAwIDMuMjRzLCBjb3ByXzlVsHJhdGlvOiAwLjAwLCBkaXN0c3FsX2NvbmN1cnJlbmN5OiAxNX1wu/8aeP///wkCIAEhaqF/AXpulzrdAigBQAFSFnRlc3Quc0HYDC5zX29B1AxfY250LUQMOTQ1LkXFLUQYNzhw0IzvCwFQFBmVJZhBKTItAwFQABEyUAAMaV9pZBVLADQpYRVLCGINQx23RDFw6OMBeP///////////wEYAQ==")
	assert.Nil(t, err)
	assert.True(t, strings.Contains(vp, "187.85333"))
}

func TestIndexJoinAndLookUPDuration(t *testing.T) {
	vp, err := GenerateBinaryPlanJSON("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")
	assert.Nil(t, err)
	assert.True(t, strings.Contains(vp, "8.1ms"))
	assert.True(t, strings.Contains(vp, "2.23"))
}

func TestApplyAndLookUPDuration(t *testing.T) {
	vp, err := GenerateBinaryPlanJSON("/haICvkWCg1Qcm9qZWN0aW9uXzEwEoYWCghBcHBseV8xMhL9BQoyHwBgMxLTBAoOVGFibGVSZWFkZXJfMTUS3AIKEAUTUEZ1bGxTY2FuXzE0IQAAAAAgZSFBKQEJ8FsAiMNAMAM4AkACSg0KCwoFdGVzdDISAnR0Uh5rZWVwIG9yZGVyOmZhbHNlLCBzdGF0czpwc2V1ZG9q6gF0aWt2X3Rhc2s6e3RpbWU6MW1zLCBsb29wczoxfSwgcwFwfGRldGFpbDoge3RvdGFsX3Byb2Nlc3Nfa2V5czogMywgRhcAIF9zaXplOiAxMhUeCS2gNCwgcm9ja3NkYjoge2RlbGV0ZV9za2lwcGVkX2NvdW50OiAwLCBrZXk+FgBMMywgYmxvY2s6IHtjYWNoZV9oaXQdMghyZWEuQQAFD0RieXRlOiAwIEJ5dGVzfX19cP8RAQQBeBEKDP8BIVUBAQjY50AuSgEkAUABUhVkYXRhOj55AQRaFCkmCC41OTkpHDJijgFjb3BfJUdIIHtudW06IDEsIG1heDogMS41NAEqITUtBSkUJUcIOiAxAR0McnBjXxE2AQwFZAE7AR0QY29wcl8Z9aByYXRpbzogMC4wMCwgZGlzdHNxbF9jb25jdXJyZW5jeTogMTV9cLcCeBnkKBoBASGqqqqqij/zQucAAEhFLRgudHQuYSwgFQwcYiwgY2FzdCgVEbBhLCBkZWNpbWFsKDIwLDApIEJJTkFSWSktPkNvbHVtbiM4WhR0aW1lOjEuNjcBtgRsb0FDDDJiDUMdmwwxcIwXPXyoEuUOCgpIYXNoQWdnXzI0EoIOCg5JbmRleExvb2tVcF8yNRKTBgoMU2VsZWlAGDIzEsUBChAFJHUOBDIxSg4DAAZlDggXChVxDjADdHQxGgcKAmlhEgFhghgDBEp0eRchuiXMGDBzLCBtaW4FCBBhdmc6IAERCHA4MAURCHA5NQUIFGl0ZXJzOiHjGGFza3M6M31WdwIIGgEBSXEIQL9AabsIUhtnOXAAMSFxOX0AKU13CDIuNl13CDdixUJ3AgAzTXcYOTU2LjTCtQ2yFCA2MjkuNgUPBbkIODA4DQ8Bty4tAAhheF8B8E2qBDIsASE6EgAAclGtBDUsBQxJrQgzLjdF6M6uAgxqlwJ0/nABNXCOtAQANmq0BAQyNxUeibQEOSzatAQANv60BF60BAgSiwZ5OBgxNxK9AQoRhakQUm93SUTFIwQyMjoVA1VoDEoOCgwuFQP+DAP+DANhDAACaQwQAPA/MAJhuShSIWZ1bmNzOnN1bZWDCDEuYpluBDExdRIENTaZbwg0YsFiEgMIODYyZQFhwhQgNjk3LjMFD2UQCDc5NW0uDHA5NToZK+4OA2Wp/g4D/g4Dkg4DADNqDgNCwgdh9dLCBwAy/g4DXg4DICH/lVB1tWEZQS5FAggBQAFNIgw1Ljg4WSIQNWKPAWnBY/GtFrwIicQMMi4wMgErMGZldGNoX2hhbmRsZToBFuWlEGJ1aWxkAQ8ANqlKDHdhaXQBDzA5OMK1c30sIHRhYmxlVlcAADdFpOXiCDIsIDatBwx9cLxL/RQgGgECIdy6VnbBMtEAAAMB0QRSHnkW7XYEMTF5FAA3FfEAOQWw6YIsNnC0ESFvNAp7AvzuLSIIiMNABU9QKXNlbWkgam9pbiwgZXF1YWw6W2VxEVoIOCwgDWQQNyldWhMlIQQ3Lj1KCDFiLy7bBwhPRkYONAgUY2hlOk9ODQoMSGl0UhKuCBwwLjAwMCVwGx3oFCFvNMohEUKUAAAW2fUujwgAWhZdCAw3Ljg3IaEJ2wAxcl0IBBgB")
	assert.Nil(t, err)
	assert.True(t, strings.Contains(vp, "5.91ms"))
	assert.True(t, strings.Contains(vp, "2.56ms"))
}

func TestShuffleDuration(t *testing.T) {
	vp, err := GenerateBinaryPlanJSON("6xhYCuYYCg1JbmRleE1lcmdlXzE2ErQEChAFEjxSYW5nZVNjYW5fOBoBASEAAQEM0IFAKQEI8J8AACRAOAJAAkoXChUKBXRlc3QyEgN0dDMaBwoCaWESAWFSK3JhbmdlOlsxLDFdLCBrZWVwIG9yZGVyOmZhbHNlLCBzdGF0czpwc2V1ZG9aFHRpbWU6NS4yOG1zLCBsb29wczoxYqkBY29wX3Rhc2s6IHtudW06IDEsIG1heDogMS4wM21zLCBwcm9jX2tleXM6IDAsIHRvdF9wcm9jOiAxAUcMcnBjXwU2BDIsBQwFZBAgMi4zOQEe8Ftjb3ByX2NhY2hlX2hpdF9yYXRpbzogMC4wMCwgZGlzdHNxbF9jb25jdXJyZW5jeTogMTV9LCBiYWNrb2Zme3JlZ2lvbk1pc3M6IDJtc31q6AF0aWt2X3Rhc2s6ewVqADEBZgRsbwXLDH0sIHMhSThkZXRhaWw6IHt0b3RhbF8Bvwxlc3NfLsIAOhcAJF9zaXplOiAwLCAJMwkrgDEsIHJvY2tzZGI6IHtkZWxldGVfc2tpcHBlZF9jb3VudAUyCGtleUoWAAxibG9jIVEZ/BkyCHJlYS5BAAUPCGJ5dAGBKCBCeXRlc319fXD/EQEEAXgRCgz/ARKjRjcCADm2NwIMYhIBYlU3CDIsMqY3AgQ3Nj1sBGKZajcCADIBKSF3LUkAMEkbTicCBDg4ASwAY/4nAjYnAgDnQicCCDBzLP4mAv4mAv4mAqomAlCoBQoMU2VsZWN0aW9uXzExEqYBChE6bgQEMTCFbCyAMQdBKauqqqqqCqpmbAQUYxIBY1IuiWwYKDMsK2luZoI4AgxqHHRpNqwDLoUBVuACKBoBASlWVVVVVdWkBY0kUhxsdChwbHVzKIX9QC50dDMuYywgMSksIDEwKVoUhQMIOC4xMpoCAKlimgIIMy43hZY2mwIAdI7RBAg1LjP+qgJOqgIA6EKqAv7RBP7RBP7RBLrRBASlBEaaAgAyttIEDGQSAWSV0gg0LDSCmgJNOAg1LjkyOAIAmmI4AgwxLjE1gac2OAJe+gYAOAUs/tME/tME/tME/tME/tMEOtMEAKRKKAIAM7YoAgxlEgFlVSgINSw1higCABOFYAQ1LmX6GmUIdicCSjAJYicCADdBU/4nAv4nAv4nAv4nAv4nAjonAgTDATL6Bjg1EmYKEVRhYmxlUm93SUQSZwskMTQpYQKtfOkPpcVjDEoOCgwuXAsIUh5rckYLXrkGIAIptM7wlofZoAVWCFIlZ0K5BghhLCDZxhRiKSwgMilWTQAgIaHrVV42sONAGVMIAUABjbYENzAWXwlNjzxwggR4////////////ARgB")
	assert.Nil(t, err)
	assert.True(t, strings.Contains(vp, "8.16ms"))
}