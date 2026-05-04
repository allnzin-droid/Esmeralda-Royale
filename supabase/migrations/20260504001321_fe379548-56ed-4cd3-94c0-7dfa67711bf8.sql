ALTER TABLE public.request_messages
  ADD CONSTRAINT attachment_size_limit
  CHECK (attachment_data_url IS NULL OR octet_length(attachment_data_url) <= 2097152);