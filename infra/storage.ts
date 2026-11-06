/** S3 bucket for uploading files (like those for chat messages) */
export const uploadsBucket = new sst.aws.Bucket('uploads', {
  // Delete objects after 60 days to reclaim orphaned uploads
  lifecycle: [
    {
      id: 'expire-after-60-days',
      expiresIn: '60 days',
    },
  ],
});
