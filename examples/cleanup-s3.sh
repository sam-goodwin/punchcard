#! /bin/sh

# deletes all non-critical S3 buckets - useful for cleaning up after testing a deployment

aws s3 ls | grep -v aws-athena-query | grep -v cdktoolkit | cut -f 3 -d ' ' | while read bucket ; do aws s3 rb s3://$bucket --force ; done
