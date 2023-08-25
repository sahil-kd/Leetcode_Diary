DROP TABLE IF EXISTS target_table;

CREATE TEMPORARY TABLE target_table (
    id INTEGER PRIMARY KEY,
    line_no INTEGER,
    line_string TEXT
);

INSERT INTO target_table (line_no, line_string)
WITH RECURSIVE find_result AS (
  SELECT
    1 AS line_no,
    7 AS commit_no,
    0 AS found  -- 0 means not found, 1 means found
  UNION ALL
  SELECT
    CASE
      WHEN cl.line_no IS NOT NULL AND fr.found = 0 THEN fr.line_no + 1
      ELSE fr.line_no
    END,
    CASE
      WHEN cl.line_no IS NOT NULL AND fr.found = 0 THEN 7
      ELSE fr.commit_no - 1
    END,
    CASE
      WHEN cl.line_no IS NOT NULL THEN 1
      ELSE 0
    END
  FROM
    find_result fr
  LEFT JOIN
    commit_log cl ON fr.line_no = cl.line_no AND fr.commit_no = cl.commit_no
  WHERE
    fr.line_no < 56  -- Replace some_value with your limit
)
SELECT
  fr.line_no,
  cl.line_string
FROM
  find_result fr
LEFT JOIN
  commit_log cl ON fr.line_no = cl.line_no AND fr.commit_no = cl.commit_no
WHERE
  fr.found = 1;



-- DROP TABLE IF EXISTS un;
-- DROP TABLE IF EXISTS dum;
-- DROP TABLE IF EXISTS res;

-- CREATE TEMPORARY TABLE un (
--     id INTEGER PRIMARY KEY,
--     line_no INTEGER,
--     line_string TEXT
-- );

-- CREATE TEMPORARY TABLE dum (
--     id INTEGER PRIMARY KEY,
--     line_no INTEGER,
--     line_string TEXT
-- );

-- CREATE TEMPORARY TABLE res (
--     id INTEGER PRIMARY KEY,
--     line_no INTEGER,
--     line_string TEXT
-- );

-- INSERT INTO un (line_no, line_string)
--     SELECT commit_log.line_no, commit_log.line_string
--     FROM commit_log
--     WHERE commit_log.commit_no = 7;

-- INSERT INTO dum (line_no, line_string)
--     SELECT commit_log.line_no, commit_log.line_string
--     FROM commit_log
--     WHERE commit_log.commit_no = 6; -- next | prev commit

------------------------------------------
-- SELECT un.line_no, COALESCE(un.line_string, dum.line_string)
-- FROM un
-- LEFT JOIN dum ON un.line_no = dum.line_no; -- working
-----------------------------------------

-- WITH RECURSIVE RecursiveQueryProcessor AS (
--     SELECT line_no, line_string FROM commit_log WHERE line_no = 1 AS L AND commit_no = 7 AS C LIMIT 1
-- )