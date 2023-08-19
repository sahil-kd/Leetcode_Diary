CREATE TEMPORARY TABLE unloader (
    line_no INTEGER,
    line_string TEXT
);

CREATE TABLE IF NOT EXISTS output_table (
    line_no INTEGER,
    line_string TEXT
);

INSERT INTO unloader(line_no, line_string)
SELECT COALESCE(r.line_no, c.line_no) AS line_no,
    COALESCE(r.line_string, c.line_string) AS line_string
FROM (
    SELECT line_no, line_string FROM commit_log WHERE commit_log.commit_no = 4 
    LIMIT COALESCE((SELECT commit_log_cache.max_lines_in_commit FROM commit_log_cache WHERE commit_no = 4), 0)
) AS r
FULL OUTER JOIN (
    SELECT line_no, line_string FROM commit_log WHERE commit_log.commit_no = 3 
    LIMIT COALESCE((SELECT commit_log_cache.max_lines_in_commit FROM commit_log_cache WHERE commit_no = 3), 0)
) AS c ON r.line_no = c.line_no
WHERE r.line_no IS NULL OR c.line_no IS NULL OR r.line_no != c.line_no
OR (r.line_no = c.line_no AND r.line_string IS NOT NULL);

-- end

INSERT INTO unloader(line_no, line_string)
SELECT COALESCE(r.line_no, c.line_no) AS line_no,
    COALESCE(r.line_string, c.line_string) AS line_string
FROM unloader AS r
FULL OUTER JOIN (
    SELECT line_no, line_string FROM commit_log WHERE commit_log.commit_no = 2 
    LIMIT COALESCE((SELECT commit_log_cache.max_lines_in_commit FROM commit_log_cache WHERE commit_no = 2), 0)
    ) AS c ON r.line_no = c.line_no
WHERE r.line_no IS NULL OR c.line_no IS NULL OR r.line_no != c.line_no
OR (r.line_no = c.line_no AND r.line_string IS NOT NULL);

-- end

INSERT INTO unloader(line_no, line_string)
SELECT COALESCE(r.line_no, c.line_no) AS line_no,
    COALESCE(r.line_string, c.line_string) AS line_string
FROM unloader AS r
FULL OUTER JOIN (
    SELECT line_no, line_string FROM commit_log WHERE commit_log.commit_no = 1 
    LIMIT COALESCE((SELECT commit_log_cache.max_lines_in_commit FROM commit_log_cache WHERE commit_no = 1), 0)
    ) AS c ON r.line_no = c.line_no
WHERE r.line_no IS NULL OR c.line_no IS NULL OR r.line_no != c.line_no
OR (r.line_no = c.line_no AND r.line_string IS NOT NULL);

-- end

INSERT INTO output_table(line_no, line_string)
SELECT DISTINCT * FROM unloader ORDER BY line_no ASC;
DROP TABLE unloader;