## Table `users`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  Nullable |
| `name` | `varchar` |  Nullable |
| `email` | `varchar` |  Nullable |
| `role` | `int8` |  Nullable |
| `status` | `bool` |  Nullable |
| `company_id` | `uuid` |  Nullable |
| `is_ia` | `bool` |  Nullable |

## Table `roles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `name` | `varchar` |  Nullable |
| `status` | `bool` |  Nullable |

## Table `companys`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `make_id` | `numeric` |  Nullable |
| `created_at` | `timestamptz` |  |
| `settings` | `jsonb` |  Nullable |
| `status` | `bool` |  Nullable |
| `plan_id` | `int8` |  Nullable |

## Table `pipelines`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `varchar` |  Nullable |
| `status` | `bool` |  Nullable |
| `settings` | `jsonb` |  Nullable |
| `company_id` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `won_stage` | `bool` |  |

## Table `pipeline_stages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `pipeline_id` | `uuid` |  Nullable |
| `name` | `varchar` |  Nullable |
| `settings` | `jsonb` |  Nullable |
| `status` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  |
| `order` | `int2` |  Nullable |
| `linear_flow` | `bool` |  |

## Table `pipeline_deals`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `pipeline_id` | `uuid` |  Nullable |
| `stage_id` | `uuid` |  Nullable |
| `name` | `varchar` |  Nullable |
| `value` | `numeric` |  Nullable |
| `status` | `int2` |  Nullable |
| `contact_id` | `uuid` |  Nullable |
| `user_id` | `uuid` |  Nullable |
| `sdr_id` | `uuid` |  Nullable |
| `closer_id` | `uuid` |  Nullable |
| `source_id` | `uuid` |  Nullable |
| `campaign_id` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  Nullable |
| `probability` | `int2` |  Nullable |
| `products_id` | `jsonb` |  Nullable |
| `conversation_id` | `uuid` |  Nullable |
| `utm` | `jsonb` |  Nullable |
| `company_id` | `uuid` |  Nullable |
| `currency` | `int8` |  |
| `activities` | `jsonb` |  Nullable |
| `custom_fields` | `jsonb` |  Nullable |
| `quotes` | `jsonb` |  Nullable |

## Table `contacts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `company_id` | `uuid` |  Nullable |
| `name` | `varchar` |  Nullable |
| `emails` | `jsonb` |  Nullable |
| `phones` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `sources`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `varchar` |  Nullable |
| `status` | `bool` |  Nullable |
| `company_id` | `uuid` |  Nullable |

## Table `campaigns`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `varchar` |  Nullable |
| `status` | `bool` |  Nullable |
| `company_id` | `uuid` |  Nullable |

## Table `pipeline_deal_stories`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `deal_id` | `uuid` |  Nullable |
| `user_id` | `uuid` |  Nullable |
| `content` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `activities_types`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `varchar` |  Nullable |
| `status` | `bool` |  Nullable |

## Table `pipeline_deal_activities`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `deal_id` | `uuid` |  Nullable |
| `user_id` | `uuid` |  Nullable |
| `status` | `int2` |  Nullable |
| `type_id` | `uuid` |  Nullable |
| `subject` | `varchar` |  Nullable |
| `description` | `text` |  Nullable |
| `do_in` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `lost_reasons`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `company_id` | `uuid` |  Nullable |
| `name` | `varchar` |  Nullable |
| `status` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `pipeline_deal_losts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `deal_id` | `uuid` |  Nullable |
| `reason_id` | `uuid` |  Nullable |
| `description` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `pipeline_deal_stage_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `deal_id` | `uuid` |  Nullable |
| `stage_id` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `user_id` | `uuid` |  Nullable |

## Table `products`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `varchar` |  Nullable |
| `price` | `numeric` |  Nullable |
| `company_id` | `uuid` |  Nullable |
| `status` | `bool` |  Nullable |
| `currency` | `int8` |  |

## Table `custom_qualification_forms`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `company_id` | `uuid` |  |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `is_active` | `bool` |  |
| `created_by` | `uuid` |  |
| `created_at` | `timestamptz` |  |

## Table `custom_qualification_forms_versions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `form_id` | `uuid` |  |
| `version` | `int4` |  |
| `is_published` | `bool` |  |
| `published_at` | `timestamptz` |  Nullable |
| `created_by` | `uuid` |  |
| `created_at` | `timestamptz` |  |

## Table `custom_qualification_forms_sections`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `form_version_id` | `uuid` |  |
| `title` | `text` |  |
| `order` | `int4` |  |

## Table `custom_qualification_forms_questions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `form_version_id` | `uuid` |  |
| `section_id` | `uuid` |  Nullable |
| `key` | `text` |  |
| `label` | `text` |  |
| `help_text` | `text` |  Nullable |
| `type` | `custom_qualification_forms_question_type` |  |
| `required` | `bool` |  |
| `order` | `int4` |  |
| `visible_if` | `jsonb` |  Nullable |
| `scoring_formula` | `jsonb` |  Nullable |
| `weight` | `numeric` |  |

## Table `custom_qualification_forms_options`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `question_id` | `uuid` |  |
| `value` | `text` |  |
| `label` | `text` |  |
| `order` | `int4` |  |
| `score` | `numeric` |  |

## Table `custom_qualification_forms_buckets`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `form_version_id` | `uuid` |  |
| `name` | `text` |  |
| `min_score` | `numeric` |  |
| `max_score` | `numeric` |  |
| `color` | `text` |  Nullable |
| `recommendation` | `text` |  Nullable |

## Table `custom_qualification_forms_submissions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `company_id` | `uuid` |  |
| `form_version_id` | `uuid` |  |
| `deal_id` | `uuid` |  |
| `contact_id` | `uuid` |  Nullable |
| `created_by` | `uuid` |  |
| `created_at` | `timestamptz` |  |
| `total_score` | `numeric` |  |
| `result_bucket_id` | `uuid` |  |
| `answers_cache` | `jsonb` |  Nullable |

## Table `custom_qualification_forms_answers`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `submission_id` | `uuid` |  |
| `question_id` | `uuid` |  |
| `option_ids` | `_uuid` |  Nullable |
| `value_text` | `text` |  Nullable |
| `value_num` | `numeric` |  Nullable |
| `score` | `numeric` |  |
| `created_at` | `timestamptz` |  |

## Table `pipeline_deal_meets`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `bot_id` | `uuid` |  Nullable Unique |
| `deal_id` | `uuid` |  Nullable |
| `user_id` | `uuid` |  Nullable |
| `type` | `varchar` |  Nullable |
| `title` | `varchar` |  Nullable |
| `event_id` | `varchar` |  Nullable |
| `created_at` | `timestamptz` |  |
| `start` | `timestamptz` |  Nullable |
| `end` | `timestamptz` |  Nullable |
| `status` | `bool` |  Nullable |
| `attendees` | `_jsonb` |  Nullable |
| `link` | `varchar` |  Nullable |
| `description` | `text` |  Nullable |
| `cost` | `numeric` |  Nullable |
| `duration` | `numeric` |  Nullable |

## Table `pipeline_deal_meet_completed`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `meet_id` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `user_id` | `uuid` |  Nullable |

## Table `inbox_settings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `identifier` | `varchar` |  |
| `settings` | `jsonb` |  Nullable |
| `user_ids` | `_jsonb` |  Nullable |
| `queue` | `bool` |  |
| `display_users_name` | `bool` |  |

## Table `inbox_types`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `name` | `varchar` |  Nullable |
| `status` | `bool` |  Nullable |
| `type` | `varchar` |  Nullable |

## Table `inboxes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `varchar` |  Nullable |
| `settings_id` | `int4` |  Nullable |
| `type_id` | `int8` |  Nullable |
| `status` | `bool` |  Nullable |
| `company_id` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `inbox_conversations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `inbox_id` | `uuid` |  Nullable |
| `name` | `varchar` |  Nullable |
| `identifier` | `varchar` |  Nullable |
| `thumbnail` | `varchar` |  Nullable |
| `created_at` | `timestamptz` |  |
| `last_message_content` | `jsonb` |  Nullable |
| `ia_actived` | `bool` |  Nullable |
| `user_id` | `uuid` |  Nullable |
| `sdr_id` | `uuid` |  Nullable |
| `closer_id` | `uuid` |  Nullable |
| `external_ids` | `jsonb` |  Nullable |
| `window_id` | `uuid` |  Nullable |
| `last_outbound_at` | `timestamptz` |  Nullable |
| `last_inbound_at` | `timestamptz` |  Nullable |

## Table `inbox_attachments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `type` | `varchar` |  Nullable |
| `extension` | `varchar` |  Nullable |
| `url` | `varchar` |  Nullable |
| `thumbnail` | `varchar` |  Nullable |
| `size` | `numeric` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `inbox_messages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `conversation_id` | `uuid` |  Nullable |
| `message_type` | `varchar` |  Nullable |
| `content` | `text` |  Nullable |
| `content_type` | `varchar` |  Nullable |
| `private` | `bool` |  Nullable |
| `status` | `varchar` |  Nullable |
| `source_id` | `varchar` |  Nullable |
| `user_id` | `uuid` |  Nullable |
| `attachment_id` | `int8` |  Nullable |
| `created_at` | `timestamptz` |  |
| `reply_id` | `varchar` |  Nullable |
| `sent_by_device` | `bool` |  Nullable |
| `inbox_id` | `uuid` |  Nullable |
| `content_template` | `jsonb` |  Nullable |
| `broadcast_id` | `int8` |  Nullable |

## Table `inbox_messages_read`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `user_id` | `uuid` |  Nullable |
| `conversation_id` | `uuid` |  Nullable |
| `last_read_message_id` | `int8` |  Nullable |
| `read_at` | `timestamptz` |  |

## Table `contact_methods`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary Identity |
| `name` | `varchar` |  Nullable |
| `type` | `varchar` |  Nullable |
| `status` | `bool` |  Nullable |

## Table `contact_identifiers`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `contact_id` | `uuid` |  Nullable |
| `identifier` | `varchar` |  |
| `method_id` | `int4` |  Nullable |
| `status` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  |
| `conversation_id` | `uuid` |  Nullable |

## Table `modules`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `varchar` |  |
| `status` | `bool` |  Nullable |

## Table `company_modules`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `company_id` | `uuid` |  Nullable |
| `module_id` | `uuid` |  Nullable |
| `status` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `inbox_providers`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary Identity |
| `name` | `varchar` |  |
| `label` | `varchar` |  Nullable |
| `schema` | `jsonb` |  Nullable |
| `type_id` | `int8` |  Nullable |

## Table `inbox_endpoint_tokens`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `status` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  |
| `expires_at` | `timestamptz` |  Nullable |
| `inbox_id` | `uuid` |  Nullable |
| `token` | `uuid` |  Nullable Unique |

## Table `inbox_endpoint_received`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `token_id` | `int8` |  Nullable |
| `payload` | `jsonb` |  Nullable |
| `received_at` | `timestamptz` |  |

## Table `pipeline_deal_quotes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `deal_id` | `uuid` |  Nullable |
| `product_id` | `uuid` |  Nullable |
| `quoted_price` | `numeric` |  Nullable |
| `closed_price` | `numeric` |  Nullable |
| `user_id` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  Nullable |
| `currency` | `int8` |  |
| `description` | `text` |  Nullable |

## Table `pipeline_deal_wons`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `deal_id` | `uuid` |  Nullable |
| `date` | `date` |  Nullable |
| `quote_id` | `uuid` |  Nullable |
| `user_id` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `ads_facebook_entities`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `facebook_user_id` | `varchar` |  Nullable |
| `facebook_account_id` | `varchar` |  Nullable |
| `facebook_account_name` | `varchar` |  Nullable |
| `facebook_page_id` | `varchar` |  Nullable |
| `type` | `varchar` |  Nullable |
| `company_id` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `status` | `bool` |  Nullable |
| `token_id` | `uuid` |  Nullable |
| `facebook_page_image` | `text` |  Nullable |
| `facebook_page_name` | `varchar` |  Nullable |
| `facebook_pixel_name` | `varchar` |  Nullable |
| `facebook_pixel_id` | `varchar` |  Nullable |

## Table `ads_facebook_tokens`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `access_token` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `company_id` | `uuid` |  Nullable |

## Table `ads_platforms`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `name` | `varchar` |  Nullable |
| `label` | `varchar` |  Nullable |
| `status` | `bool` |  Nullable |

## Table `ads_accounts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `account_id` | `varchar` |  Nullable |
| `account_name` | `varchar` |  Nullable |
| `platform_id` | `int8` |  Nullable |
| `company_id` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `status` | `bool` |  Nullable |

## Table `pipeline_deal_utms`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `company_id` | `uuid` |  Nullable |
| `deal_id` | `uuid` |  Nullable |
| `utm_id` | `varchar` |  Nullable |
| `utm_term` | `varchar` |  Nullable |
| `utm_medium` | `varchar` |  Nullable |
| `utm_source` | `varchar` |  Nullable |
| `utm_content` | `varchar` |  Nullable |
| `utm_campaign` | `varchar` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `custom_fields`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `company_id` | `uuid` |  Nullable |
| `entity` | `varchar` |  Nullable |
| `name` | `varchar` |  Nullable |
| `label` | `text` |  Nullable |
| `type` | `varchar` |  Nullable |
| `options` | `json` |  Nullable |
| `required` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  Nullable |
| `status` | `bool` |  Nullable |

## Table `custom_field_values`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `entity` | `varchar` |  Nullable |
| `entity_id` | `uuid` |  Nullable |
| `field_id` | `uuid` |  Nullable |
| `value` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  Nullable |

## Table `ads_google_entities`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `google_user_id` | `numeric` |  Nullable |
| `google_account_id` | `numeric` |  Nullable |
| `google_account_name` | `varchar` |  Nullable |
| `type` | `varchar` |  Nullable |
| `company_id` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `status` | `bool` |  Nullable |
| `token_id` | `uuid` |  Nullable |

## Table `ads_google_tokens`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `access_token` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `refresh_token` | `text` |  Nullable |

## Table `company_tokens`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `company_id` | `uuid` | Primary |
| `token` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `ads_facebook_forms`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `facebook_user_id` | `varchar` |  Nullable |
| `facebook_page_id` | `varchar` |  Nullable |
| `facebook_form_id` | `varchar` | Primary |
| `facebook_form_name` | `varchar` |  Nullable |
| `company_id` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `ads_facebook_form_optins`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `facebook_form_id` | `varchar` | Primary |
| `settings` | `jsonb` |  Nullable |
| `status` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  |
| `distribution_actived` | `bool` |  |
| `redistribution_actived` | `bool` |  |

## Table `inbox_optins`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `inbox_id` | `uuid` |  Nullable |
| `settings` | `jsonb` |  Nullable |
| `status` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  |
| `distribution_actived` | `bool` |  |
| `redistribution_actived` | `bool` |  |
| `redistribution_mode` | `varchar` |  Nullable |

## Table `meet_google_tokens`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `company_id` | `uuid` |  Nullable |
| `user_id` | `uuid` |  Nullable |
| `code` | `text` |  Nullable |
| `access_token` | `text` |  Nullable |
| `refresh_token` | `text` |  Nullable |
| `external_id` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `id_token` | `text` |  Nullable |
| `id_data` | `jsonb` |  Nullable |

## Table `payment_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `event_id` | `varchar` |  Nullable |
| `type` | `varchar` |  Nullable |
| `content` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  |
| `customer_id` | `varchar` |  Nullable |

## Table `payment_subscriptions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `company_id` | `uuid` |  Nullable |
| `customer_id` | `varchar` |  Nullable |
| `subscription_id` | `varchar` |  Nullable |
| `plan_id` | `varchar` |  Nullable |
| `plan_active` | `bool` |  Nullable |
| `plan_quantity` | `int4` |  Nullable |
| `price_id` | `varchar` |  Nullable |
| `price_active` | `bool` |  Nullable |
| `product_id` | `varchar` |  Nullable |
| `trial_start` | `timestamptz` |  Nullable |
| `trial_end` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `subscription_active` | `bool` |  Nullable |

## Table `user_phones`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `user_id` | `uuid` |  Nullable |
| `phone` | `numeric` |  Nullable |
| `confirmed` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `user_phone_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `phone_id` | `int8` |  Nullable |
| `code` | `numeric` |  Nullable |
| `created_at` | `timestamptz` |  |
| `expirated_at` | `timestamptz` |  Nullable |

## Table `plans`

Planos do MakeCRM

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `name` | `varchar` |  Nullable |
| `value` | `numeric` |  Nullable |
| `method` | `varchar` |  Nullable |
| `created_at` | `timestamptz` |  |
| `lead_limit` | `int8` |  Nullable |
| `contact_limit` | `int8` |  Nullable |
| `storage_limit` | `int8` |  Nullable |
| `inbox_limit` | `int8` |  Nullable |

## Table `plan_external_links`

Vinculo dos planos de provedores externos

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `externa_id` | `varchar` |  Nullable |
| `provider` | `varchar` |  Nullable |
| `plan_id` | `int8` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `app_settings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `app_id` | `uuid` |  Nullable |
| `settings` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `app_types`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `name` | `varchar` |  Nullable |
| `type` | `varchar` |  Nullable |
| `status` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `apps`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `company_id` | `uuid` |  Nullable |
| `name` | `varchar` |  Nullable |
| `type_id` | `int8` |  Nullable |
| `settings_id` | `uuid` |  Nullable |
| `status` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `app_entities`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `app_id` | `uuid` |  Nullable |
| `status` | `bool` |  Nullable |
| `data` | `jsonb` |  Nullable |

## Table `inbox_connection_status`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` |  Identity |
| `inbox_id` | `uuid` | Primary |
| `status` | `int8` |  Nullable |
| `updated_at` | `timestamptz` |  |

## Table `company_storages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `type` | `varchar` |  Nullable |
| `extension` | `varchar` |  Nullable |
| `url` | `varchar` |  Nullable |
| `thumbnail` | `varchar` |  Nullable |
| `size` | `numeric` |  Nullable |
| `created_at` | `timestamptz` |  |
| `company_id` | `uuid` |  Nullable |
| `user_id` | `uuid` |  Nullable |
| `entity_type` | `varchar` |  Nullable |
| `entity_id` | `uuid` |  Nullable |

## Table `inbox_messages_status`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `user_id` | `uuid` |  Nullable |
| `conversation_id` | `uuid` |  Nullable |
| `message_id` | `int8` |  Nullable |
| `created_at` | `timestamptz` |  |
| `status` | `varchar` |  Nullable |
| `details` | `jsonb` |  Nullable |

## Table `inbox_tags`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `company_id` | `uuid` |  Nullable |
| `label` | `varchar` |  Nullable |
| `color` | `varchar` |  Nullable |
| `status` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `inbox_conversation_tags`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `conversation_id` | `uuid` |  Nullable |
| `tag_id` | `int8` |  Nullable |

## Table `inbox_shortcuts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `company_id` | `uuid` |  Nullable |
| `user_id` | `uuid` |  Nullable |
| `shortcut` | `varchar` |  Nullable |
| `content` | `text` |  Nullable |
| `status` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  |
| `attachment_ids` | `jsonb` |  |

## Table `inbox_company_shortcuts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `company_id` | `uuid` |  Nullable |
| `shortcut_id` | `int8` |  Nullable |

## Table `inbox_user_shortcuts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `user_id` | `uuid` |  Nullable |
| `shortcut_id` | `int8` |  Nullable |

## Table `pipeline_imports`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `import_id` | `uuid` |  Nullable Unique |
| `company_id` | `uuid` |  Nullable |
| `user_id` | `uuid` |  Nullable |
| `name` | `text` |  Nullable |
| `file` | `text` |  Nullable |
| `extension` | `varchar` |  Nullable |
| `size` | `numeric` |  Nullable |
| `rows` | `int8` |  Nullable |
| `created_at` | `timestamptz` |  |
| `file_id` | `varchar` |  Nullable Unique |

## Table `pipeline_import_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `import_id` | `uuid` |  Nullable |
| `item_id` | `uuid` |  Nullable Unique |
| `row_index` | `int4` |  Nullable |
| `row_content` | `jsonb` |  Nullable |
| `status` | `varchar` |  Nullable |
| `created_deal_id` | `uuid` |  Nullable |
| `created_contact_id` | `uuid` |  Nullable |

## Table `pipeline_deal_meet_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `bot_id` | `uuid` |  Nullable |
| `event` | `varchar` |  Nullable |
| `event_code` | `varchar` |  Nullable |
| `content` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `pipeline_deal_meet_transcriptions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `bot_id` | `uuid` |  Nullable |
| `speakers` | `jsonb` |  Nullable |
| `summary` | `jsonb` |  Nullable |
| `text_record` | `text` |  Nullable |
| `video_record` | `text` |  Nullable |
| `original_transcript` | `jsonb` |  Nullable |
| `email_transcript` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `pipeline_deal_meet_settings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `company_id` | `uuid` |  Nullable Unique |
| `ai_name` | `varchar` |  Nullable |
| `record` | `bool` |  Nullable |

## Table `bi_metrics`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `key` | `text` |  Unique |
| `name` | `text` |  |
| `entity` | `text` |  |
| `aggregation` | `text` |  |
| `field` | `text` |  |
| `allowed_filters` | `jsonb` |  |
| `created_at` | `timestamptz` |  |

## Table `bi_dashboards`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `name` | `text` |  |
| `created_at` | `timestamptz` |  |

## Table `bi_dashboard_widgets`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `dashboard_id` | `uuid` |  Nullable |
| `metric_key` | `text` |  |
| `widget_type` | `text` |  |
| `filters` | `jsonb` |  |
| `layout` | `jsonb` |  |
| `created_at` | `timestamptz` |  |

## Table `pipeline_user_access`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `user_id` | `uuid` |  |
| `pipeline_id` | `uuid` |  |

## Table `inbox_conversation_pins`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `user_id` | `uuid` |  |
| `conversation_id` | `uuid` |  |

## Table `inbox_conversation_unreads`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `user_id` | `uuid` |  Nullable |
| `conversation_id` | `uuid` |  Nullable |

## Table `inbox_optin_distributions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `inbox_id` | `uuid` | Primary |
| `user_id` | `uuid` | Primary |
| `distribution` | `int4` |  |
| `created_at` | `timestamptz` |  |
| `work_hours` | `bool` |  |

## Table `inbox_optin_distribution_runtime`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `inbox_id` | `uuid` | Primary |
| `user_id` | `uuid` | Primary |
| `current_count` | `int4` |  |
| `updated_at` | `timestamptz` |  |

## Table `onboardings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `status` | `bool` |  |
| `label` | `text` |  |
| `total_steps` | `int4` |  |

## Table `onboarding_steps`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `onboard_id` | `uuid` |  |
| `name` | `text` |  Nullable |
| `label` | `text` |  |
| `status` | `bool` |  |
| `id` | `uuid` | Primary |
| `step` | `int4` |  |
| `description` | `text` |  Nullable |

## Table `onboarding_users`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `user_id` | `uuid` | Primary |
| `onboard_id` | `uuid` | Primary |
| `actived` | `bool` |  |
| `completed` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  Nullable |

## Table `onboarding_user_steps`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `user_id` | `uuid` |  |
| `onboard_id` | `uuid` |  |
| `step` | `int4` |  |
| `completed` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `inbox_responsibility`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `created_at` | `timestamptz` |  |
| `inbox_id` | `uuid` | Primary |
| `user_id` | `uuid` |  Nullable |
| `sdr_id` | `uuid` |  Nullable |
| `closer_id` | `uuid` |  Nullable |

## Table `agents`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary Unique |
| `name` | `text` |  |
| `status` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `company_id` | `uuid` | Primary |
| `type` | `text` |  |

## Table `agent_external_connections`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `external_id` | `text` | Primary |
| `agent_id` | `uuid` | Primary |
| `company_id` | `uuid` | Primary |

## Table `agent_inbox_connections`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `inbox_id` | `uuid` |  |
| `agent_id` | `uuid` |  |
| `id` | `int8` | Primary Unique Identity |

## Table `currencys`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `code` | `text` |  |
| `symbol` | `text` |  |
| `name` | `text` |  |

## Table `workflows`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `company_id` | `uuid` |  |
| `name` | `text` |  Nullable |
| `status` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `entity` | `text` |  |
| `json_data` | `jsonb` |  Nullable |
| `user_id` | `uuid` |  |

## Table `workflow_triggers`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `workflow_id` | `uuid` |  Unique |
| `type_id` | `int8` |  |
| `settings` | `jsonb` |  Nullable |
| `ui_position` | `jsonb` |  |

## Table `workflow_actions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` |  |
| `workflow_id` | `uuid` |  |
| `type_id` | `int8` |  |
| `settings` | `jsonb` |  |
| `order` | `int8` |  |
| `ui_position` | `jsonb` |  |
| `next_action_id` | `uuid` |  Nullable |
| `branching_logic` | `jsonb` |  Nullable |
| `parent_id` | `uuid` |  Nullable |
| `source_handle` | `text` |  Nullable |
| `row_id` | `int8` | Primary Unique Identity |

## Table `workflow_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `workflow_id` | `uuid` |  |
| `entity_id` | `uuid` |  |
| `status` | `text` |  |
| `details` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `session_id` | `uuid` |  |

## Custom Types / Enums

### `custom_qualification_forms_question_type`

`single_choice` | `multi_choice` | `boolean` | `number` | `currency` | `text` | `date` | `rating`

### `utm_type`

`utm_id` | `utm_term` | `utm_medium` | `utm_source` | `utm_content` | `utm_campaign`

## RLS Policies

### `pipeline_deal_meet_completed`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert pipeline_deal_meet_completed` | INSERT | anon, authenticated | PERMISSIVE | — | `true` |
| `Select pipeline_deal_meet_completed` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (((pipeline_deal_meets pdm      JOIN pipeline_deals pd ON ((pdm.deal_id = pd.id)))      JOIN pipelines p ON ((pd.pipeline_id = p.id)))      JOIN users u ON ((u.id = auth.uid())))   WHERE ((pdm.id = pipeline_deal_meet_completed.meet_id) AND (p.company_id = u.company_id))))` | — |
| `Update pipeline_deal_meet_completed` | UPDATE | anon, authenticated | PERMISSIVE | `true` | — |

### `activities_types`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable read access for all users` | SELECT | public | PERMISSIVE | `true` | — |

### `inbox_messages`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert inbox_messages` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM (inbox_conversations ic      JOIN inboxes i ON ((ic.inbox_id = i.id)))   WHERE ((ic.id = inbox_messages.conversation_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` |
| `Select inbox_messages` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (inbox_conversations ic      JOIN inboxes i ON ((ic.inbox_id = i.id)))   WHERE ((ic.id = inbox_messages.conversation_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Update inbox_messages` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (inbox_conversations ic      JOIN inboxes i ON ((ic.inbox_id = i.id)))   WHERE ((ic.id = inbox_messages.conversation_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `pipeline_deal_stage_logs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable insert for authenticated users only` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `Enable read access for all users` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM ((pipeline_deals pd      JOIN pipelines p ON ((pd.pipeline_id = p.id)))      JOIN users u ON ((u.id = auth.uid())))   WHERE ((pd.id = pipeline_deal_stage_logs.deal_id) AND (p.company_id = u.company_id))))` | — |

### `sources`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable read access for all users` | SELECT | anon | PERMISSIVE | `true` | — |
| `Enable users to view their own data only` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users u   WHERE ((u.id = auth.uid()) AND (u.company_id = sources.company_id))))` | — |
| `Insert sources` | INSERT | anon, authenticated | PERMISSIVE | — | `true` |
| `Update sources` | UPDATE | anon, authenticated | PERMISSIVE | `true` | — |

### `users`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable read access for all users` | SELECT | public | PERMISSIVE | `true` | — |
| `Insert users` | INSERT | anon, authenticated | PERMISSIVE | — | `true` |
| `Update users` | UPDATE | anon, authenticated | PERMISSIVE | `true` | — |

### `pipeline_deals`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable insert for authenticated users only` | INSERT | anon, authenticated | PERMISSIVE | — | `true` |
| `Enable read access for all users` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM pipelines p   WHERE ((p.id = pipeline_deals.pipeline_id) AND (p.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Policy with table joins` | UPDATE | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users u   WHERE (u.id = auth.uid())))` | — |

### `pipeline_deal_quotes`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert pipeline_deal_quotes` | INSERT | anon, authenticated | PERMISSIVE | — | `true` |
| `Select pipeline_deal_quotes` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM ((pipeline_deals pd      JOIN pipelines p ON ((pd.pipeline_id = p.id)))      JOIN users u ON ((u.id = auth.uid())))   WHERE ((pd.id = pipeline_deal_quotes.deal_id) AND (p.company_id = u.company_id))))` | — |
| `Update pipeline_deal_quotes` | UPDATE | anon, authenticated | PERMISSIVE | `true` | — |

### `pipeline_deal_activities`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable insert for authenticated users only` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `Enable read access for all users` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM ((pipeline_deals pd      JOIN pipelines p ON ((pd.pipeline_id = p.id)))      JOIN users u ON ((u.id = auth.uid())))   WHERE ((pd.id = pipeline_deal_activities.deal_id) AND (p.company_id = u.company_id))))` | — |
| `Policy with table joins` | UPDATE | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users u   WHERE (u.id = auth.uid())))` | — |

### `contacts`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable users to view all company contacts` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users u   WHERE ((u.id = auth.uid()) AND (u.company_id = contacts.company_id))))` | — |
| `Insert contacts` | INSERT | authenticated | PERMISSIVE | — | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` |
| `Update contacts` | UPDATE | authenticated | PERMISSIVE | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` | — |

### `roles`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable read access for all users` | SELECT | public | PERMISSIVE | `true` | — |

### `pipeline_deal_losts`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable insert for authenticated users only` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `Enable read access for all users` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM ((pipeline_deals pd      JOIN pipelines p ON ((pd.pipeline_id = p.id)))      JOIN users u ON ((u.id = auth.uid())))   WHERE ((pd.id = pipeline_deal_losts.deal_id) AND (p.company_id = u.company_id))))` | — |

### `inbox_providers`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select inbox_providers` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |

### `custom_qualification_forms_answers`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert custom_qualification_forms_answers` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM ((custom_qualification_forms_questions cqfq      JOIN custom_qualification_forms_versions cqfv ON ((cqfq.form_version_id = cqfv.id)))      JOIN custom_qualification_forms cqf ON ((cqfv.form_id = cqf.id)))   WHERE ((cqfq.id = custom_qualification_forms_answers.question_id) AND (cqf.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` |
| `Select custom_qualification_forms_answers` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM ((custom_qualification_forms_questions cqfq      JOIN custom_qualification_forms_versions cqfv ON ((cqfq.form_version_id = cqfv.id)))      JOIN custom_qualification_forms cqf ON ((cqfv.form_id = cqf.id)))   WHERE ((cqfq.id = custom_qualification_forms_answers.question_id) AND (cqf.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Update custom_qualification_forms_answers` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM ((custom_qualification_forms_questions cqfq      JOIN custom_qualification_forms_versions cqfv ON ((cqfq.form_version_id = cqfv.id)))      JOIN custom_qualification_forms cqf ON ((cqfv.form_id = cqf.id)))   WHERE ((cqfq.id = custom_qualification_forms_answers.question_id) AND (cqf.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `inbox_attachments`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert inbox_attachments` | INSERT | anon, authenticated | PERMISSIVE | — | `true` |
| `Select inbox_attachments` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |
| `Update inbox_attachments` | UPDATE | anon, authenticated | PERMISSIVE | `true` | — |

### `campaigns`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable read access for all users` | SELECT | anon | PERMISSIVE | `true` | — |
| `Enable users to view their own data only` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users u   WHERE ((u.id = auth.uid()) AND (u.company_id = campaigns.company_id))))` | — |
| `Insert campaigns` | INSERT | anon, authenticated | PERMISSIVE | — | `true` |
| `Update campaigns` | UPDATE | anon, authenticated | PERMISSIVE | `true` | — |

### `pipeline_stages`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable read access for all users` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM pipelines p   WHERE ((p.id = pipeline_stages.pipeline_id) AND (p.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Insert pipeline_stages` | INSERT | anon, authenticated | PERMISSIVE | — | `true` |
| `Update pipeline_stages` | UPDATE | anon, authenticated | PERMISSIVE | `true` | — |

### `inbox_types`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select inbox_types` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |

### `inboxes`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert inboxes` | INSERT | authenticated | PERMISSIVE | — | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` |
| `Select inboxes` | SELECT | authenticated | PERMISSIVE | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` | — |
| `Update inboxes` | UPDATE | authenticated | PERMISSIVE | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` | — |

### `custom_qualification_forms`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert custom_qualification_forms` | INSERT | authenticated | PERMISSIVE | — | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` |
| `Select custom_qualification_forms` | SELECT | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |
| `Update custom_qualification_forms` | UPDATE | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |

### `custom_qualification_forms_versions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert custom_qualification_forms_versions` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM custom_qualification_forms cqf   WHERE ((cqf.id = custom_qualification_forms_versions.form_id) AND (cqf.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` |
| `Select custom_qualification_forms_versions` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM custom_qualification_forms cqf   WHERE ((cqf.id = custom_qualification_forms_versions.form_id) AND (cqf.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Update custom_qualification_forms_versions` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM custom_qualification_forms cqf   WHERE ((cqf.id = custom_qualification_forms_versions.form_id) AND (cqf.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `custom_qualification_forms_sections`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All custom_qualification_forms_sections` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (custom_qualification_forms_versions cqfv      JOIN custom_qualification_forms cqf ON ((cqfv.form_id = cqf.id)))   WHERE ((cqfv.id = custom_qualification_forms_sections.form_version_id) AND (cqf.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `products`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert products` | INSERT | authenticated | PERMISSIVE | — | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` |
| `Select products` | SELECT | authenticated | PERMISSIVE | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` | — |
| `Update products` | UPDATE | authenticated | PERMISSIVE | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` | — |

### `companys`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable read access for all users` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |

### `lost_reasons`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable insert for authenticated users only` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `Enable read access for all users` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `Policy with table joins` | UPDATE | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users u   WHERE (u.id = auth.uid())))` | — |

### `custom_qualification_forms_questions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All custom_qualification_forms_questions` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (custom_qualification_forms_versions cqfv      JOIN custom_qualification_forms cqf ON ((cqfv.form_id = cqf.id)))   WHERE ((cqfv.id = custom_qualification_forms_questions.form_version_id) AND (cqf.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `custom_qualification_forms_submissions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert custom_qualification_forms_submissions` | INSERT | authenticated | PERMISSIVE | — | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` |
| `Select custom_qualification_forms_submissions` | SELECT | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |
| `Update custom_qualification_forms_submissions` | UPDATE | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |

### `pipeline_deal_stories`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable insert for authenticated users only` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `Enable read access for all users` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM ((pipeline_deals pd      JOIN pipelines p ON ((pd.pipeline_id = p.id)))      JOIN users u ON ((u.id = auth.uid())))   WHERE ((pd.id = pipeline_deal_stories.deal_id) AND (p.company_id = u.company_id))))` | — |

### `custom_qualification_forms_options`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All custom_qualification_forms_options` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM ((custom_qualification_forms_questions cqfq      JOIN custom_qualification_forms_versions cqfv ON ((cqfq.form_version_id = cqfv.id)))      JOIN custom_qualification_forms cqf ON ((cqfv.form_id = cqf.id)))   WHERE ((cqfq.id = custom_qualification_forms_options.question_id) AND (cqf.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `custom_qualification_forms_buckets`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All custom_qualification_forms_buckets` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (custom_qualification_forms_versions cqfv      JOIN custom_qualification_forms cqf ON ((cqfv.form_id = cqf.id)))   WHERE ((cqfv.id = custom_qualification_forms_buckets.form_version_id) AND (cqf.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `pipeline_deal_meets`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert pipeline_deal_meets` | INSERT | anon, authenticated | PERMISSIVE | — | `true` |
| `Select pipeline_deal_meets` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM ((pipeline_deals pd      JOIN pipelines p ON ((pd.pipeline_id = p.id)))      JOIN users u ON ((u.id = auth.uid())))   WHERE ((pd.id = pipeline_deal_meets.deal_id) AND (p.company_id = u.company_id))))` | — |
| `Update pipeline_deal_meets` | UPDATE | anon, authenticated | PERMISSIVE | `true` | — |

### `user_phones`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All user_phones` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users u   WHERE ((u.id = user_phones.user_id) AND (u.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Insert user_phones` | INSERT | authenticated | PERMISSIVE | — | `((user_id = auth.uid()) OR (user_id IN ( SELECT u.id    FROM users u   WHERE (u.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` |
| `Select user_phones` | SELECT | authenticated | PERMISSIVE | `(auth.uid() = user_id)` | — |
| `Update user_phones` | UPDATE | authenticated | PERMISSIVE | `((user_id = auth.uid()) OR (user_id IN ( SELECT u.id    FROM users u   WHERE (u.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `custom_fields`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert custom_fields` | INSERT | anon, authenticated | PERMISSIVE | — | `true` |
| `Select custom_fields` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |
| `Update custom_fields` | UPDATE | anon, authenticated | PERMISSIVE | `true` | — |

### `inbox_conversation_pins`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Delete inbox_conversation_pins` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (inbox_conversations ic      JOIN inboxes i ON ((ic.inbox_id = i.id)))   WHERE ((ic.id = inbox_conversation_pins.conversation_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Insert inbox_conversation_pins` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM (inbox_conversations ic      JOIN inboxes i ON ((ic.inbox_id = i.id)))   WHERE ((ic.id = inbox_conversation_pins.conversation_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` |
| `Select inbox_conversation_pins` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (inbox_conversations ic      JOIN inboxes i ON ((ic.inbox_id = i.id)))   WHERE ((ic.id = inbox_conversation_pins.conversation_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `inbox_endpoint_tokens`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert inbox_endpoint_tokens` | INSERT | anon, authenticated | PERMISSIVE | — | `true` |
| `Select inbox_endpoint_tokens` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |

### `agent_languages`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select agent_languages` | SELECT | authenticated | PERMISSIVE | `true` | — |

### `pipeline_deal_wons`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert pipeline_deal_wons` | INSERT | anon, authenticated | PERMISSIVE | — | `true` |
| `Select pipeline_deal_wons` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM ((pipeline_deals pd      JOIN pipelines p ON ((pd.pipeline_id = p.id)))      JOIN users u ON ((u.id = auth.uid())))   WHERE ((pd.id = pipeline_deal_wons.deal_id) AND (p.company_id = u.company_id))))` | — |
| `Update pipeline_deal_wons` | UPDATE | anon, authenticated | PERMISSIVE | `true` | — |

### `workflow_actions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `manage_actions_v3` | ALL | authenticated | PERMISSIVE | `(workflow_id IN ( SELECT workflows.id    FROM workflows   WHERE (workflows.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid())))))` | `(workflow_id IN ( SELECT workflows.id    FROM workflows   WHERE (workflows.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid())))))` |

### `custom_field_values`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert custom_field_values` | INSERT | anon, authenticated | PERMISSIVE | — | `true` |
| `Select custom_field_values` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |
| `Update custom_field_values` | UPDATE | anon, authenticated | PERMISSIVE | `true` | — |

### `inbox_messages_read`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert inbox_messages_read` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM (inbox_conversations ic      JOIN inboxes i ON ((ic.inbox_id = i.id)))   WHERE ((ic.id = inbox_messages_read.conversation_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` |
| `Select inbox_messages_read` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (inbox_conversations ic      JOIN inboxes i ON ((ic.inbox_id = i.id)))   WHERE ((ic.id = inbox_messages_read.conversation_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Update inbox_messages_read` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (inbox_conversations ic      JOIN inboxes i ON ((ic.inbox_id = i.id)))   WHERE ((ic.id = inbox_messages_read.conversation_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `workflow_trigger_types`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select workflow_trigger_types` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |

### `ads_google_entities`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert ads_google_entities` | INSERT | anon, authenticated | PERMISSIVE | — | `true` |
| `Seletc ads_google_entities` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |
| `Update ads_google_entities` | UPDATE | anon, authenticated | PERMISSIVE | `true` | — |

### `company_modules`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert company_modules` | INSERT | anon, authenticated | PERMISSIVE | — | `true` |
| `Select company_modules` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |
| `Update company_modules` | UPDATE | anon, authenticated | PERMISSIVE | `true` | — |

### `ads_accounts`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert ads_accounts` | INSERT | authenticated | PERMISSIVE | — | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` |
| `Select ads_accounts` | SELECT | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |
| `Update ads_accounts` | UPDATE | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |

### `ads_facebook_entities`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All ads_facebook_entities` | ALL | authenticated | PERMISSIVE | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` | — |

### `ads_facebook_tokens`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All ads_facebook_tokens` | ALL | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |

### `pipeline_deal_utms`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert pipeline_deal_utms` | INSERT | authenticated | PERMISSIVE | — | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` |
| `Select pipeline_deal_utms` | SELECT | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |
| `Update pipeline_deal_utms` | UPDATE | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |

### `modules`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select modules` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |

### `ads_google_tokens`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert ads_google_tokens` | INSERT | anon, authenticated | PERMISSIVE | — | `true` |
| `Select ads_google_tokens` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |
| `Update ads_google_tokens` | UPDATE | anon, authenticated | PERMISSIVE | `true` | — |

### `inbox_phone_optins_distribution_runtime`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Delete inbox_phone_optins_distribution_runtime` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (inbox_phones ip      JOIN inboxes i ON ((i.id = ip.inbox_id)))   WHERE ((ip.id = inbox_phone_optins_distribution_runtime.phone_id) AND (i.company_id = ( SELECT u.company_id            FROM users u           WHERE (u.id = auth.uid()))))))` | — |
| `Insert inbox_phone_optins_distribution_runtime` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM (inbox_phones ip      JOIN inboxes i ON ((i.id = ip.inbox_id)))   WHERE ((ip.id = inbox_phone_optins_distribution_runtime.phone_id) AND (i.company_id = ( SELECT u.company_id            FROM users u           WHERE (u.id = auth.uid()))))))` |
| `Select inbox_phone_optins_distribution_runtime` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (inbox_phones ip      JOIN inboxes i ON ((i.id = ip.inbox_id)))   WHERE ((ip.id = inbox_phone_optins_distribution_runtime.phone_id) AND (i.company_id = ( SELECT u.company_id            FROM users u           WHERE (u.id = auth.uid()))))))` | — |
| `Update inbox_phone_optins_distribution_runtime` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (inbox_phones ip      JOIN inboxes i ON ((i.id = ip.inbox_id)))   WHERE ((ip.id = inbox_phone_optins_distribution_runtime.phone_id) AND (i.company_id = ( SELECT u.company_id            FROM users u           WHERE (u.id = auth.uid()))))))` | — |

### `inbox_optins`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert inbox_optins` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `Select inbox_optins` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `Update inbox_optins` | UPDATE | authenticated | PERMISSIVE | `true` | — |

### `ads_platforms`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select ads_platforms` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |

### `pipeline_optin_distributions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Delete pipeline_optin_distributions` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM pipelines i   WHERE ((i.id = pipeline_optin_distributions.pipeline_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Insert pipeline_optin_distributions` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM pipelines i   WHERE ((i.id = pipeline_optin_distributions.pipeline_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` |
| `Select pipeline_optin_distributions` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM pipelines i   WHERE ((i.id = pipeline_optin_distributions.pipeline_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Update pipeline_optin_distributions` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM pipelines i   WHERE ((i.id = pipeline_optin_distributions.pipeline_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `contact_identifiers`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Delete contact_identifiers` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (contacts c      JOIN users u ON ((u.id = auth.uid())))   WHERE ((c.id = contact_identifiers.contact_id) AND (c.company_id = u.company_id))))` | — |
| `Insert contact_identifiers` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM (contacts c      JOIN users u ON ((u.id = auth.uid())))   WHERE ((c.id = contact_identifiers.contact_id) AND (c.company_id = u.company_id))))` |
| `Select contact_identifiers` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (contacts c      JOIN users u ON ((u.id = auth.uid())))   WHERE ((c.id = contact_identifiers.contact_id) AND (c.company_id = u.company_id))))` | — |
| `Update contact_identifiers` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (contacts c      JOIN users u ON ((u.id = auth.uid())))   WHERE ((c.id = contact_identifiers.contact_id) AND (c.company_id = u.company_id))))` | — |

### `inbox_company_shortcuts`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Delete inbox_company_shortcuts` | DELETE | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |
| `Insert inbox_company_shortcuts` | INSERT | authenticated | PERMISSIVE | — | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` |
| `Select inbox_company_shortcuts` | SELECT | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |
| `Update inbox_company_shortcuts` | UPDATE | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |

### `company_tokens`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert company_tokens` | INSERT | anon, authenticated | PERMISSIVE | — | `true` |
| `Select company_tokens` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |

### `contact_methods`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select contact_methods` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |

### `ads_facebook_forms`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert ads_facebook_forms` | INSERT | anon, authenticated | PERMISSIVE | — | `true` |
| `Select ads_facebook_forms` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |
| `Update ads_facebook_forms` | UPDATE | anon, authenticated | PERMISSIVE | `true` | — |

### `workflows`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert workflows` | INSERT | authenticated | PERMISSIVE | — | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` |
| `Select workflows` | SELECT | authenticated | PERMISSIVE | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` | — |
| `Update workflows` | UPDATE | authenticated | PERMISSIVE | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` | — |

### `workflow_action_types`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select workflow_action_types` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |

### `workflow_triggers`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert workflow_triggers` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM workflows w   WHERE ((w.id = workflow_triggers.workflow_id) AND (w.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` |
| `Select workflow_triggers` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM workflows w   WHERE ((w.id = workflow_triggers.workflow_id) AND (w.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Update workflow_triggers` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM workflows w   WHERE ((w.id = workflow_triggers.workflow_id) AND (w.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `pipeline_deal_meet_logs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert pipeline_deal_meet_logs` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM ((pipeline_deal_meets pdm      JOIN pipeline_deals pd ON ((pd.id = pdm.deal_id)))      JOIN users u ON ((u.id = auth.uid())))   WHERE ((pdm.bot_id = pipeline_deal_meet_logs.bot_id) AND (pd.company_id = u.company_id))))` |
| `Select pipeline_deal_meet_logs` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM ((pipeline_deal_meets pdm      JOIN pipeline_deals pd ON ((pd.id = pdm.deal_id)))      JOIN users u ON ((u.id = auth.uid())))   WHERE ((pdm.bot_id = pipeline_deal_meet_logs.bot_id) AND (pd.company_id = u.company_id))))` | — |

### `agent_attachment_triggers`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All agent_attachment_triggers` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM agents a   WHERE ((a.id = agent_attachment_triggers.agent_id) AND (a.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `agent_business_profiles`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All agent_business_profiles` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM agents a   WHERE ((a.id = agent_business_profiles.agent_id) AND (a.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `plans`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select plans` | SELECT | authenticated | PERMISSIVE | `true` | — |

### `meet_google_tokens`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert meet_google_tokens` | INSERT | authenticated | PERMISSIVE | — | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` |
| `Select meet_google_tokens` | SELECT | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |
| `Update meet_google_tokens` | UPDATE | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |

### `inbox_messages_status`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert inbox_messages_status` | INSERT | authenticated | PERMISSIVE | — | `(auth.uid() = user_id)` |
| `Select inbox_messages_status` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (inbox_conversations ic      JOIN inboxes i ON ((ic.inbox_id = i.id)))   WHERE ((ic.id = inbox_messages_status.conversation_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `payment_subscriptions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select payment_subscriptions` | SELECT | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |

### `ai_chat_sessions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All ai_chat_sessions` | ALL | authenticated | PERMISSIVE | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` | — |

### `ads_facebook_form_optins`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert ads_facebook_form_optins` | INSERT | anon, authenticated | PERMISSIVE | — | `true` |
| `Select ads_facebook_form_optins` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |
| `Update ads_facebook_form_optins` | UPDATE | anon, authenticated | PERMISSIVE | `true` | — |

### `pipeline_optin_distribution_runtime`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Delete pipeline_optin_distribution_runtime` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM pipelines i   WHERE ((i.id = pipeline_optin_distribution_runtime.pipeline_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Insert pipeline_optin_distribution_runtime` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM pipelines i   WHERE ((i.id = pipeline_optin_distribution_runtime.pipeline_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` |
| `Select pipeline_optin_distribution_runtime` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM pipelines i   WHERE ((i.id = pipeline_optin_distribution_runtime.pipeline_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Update pipeline_optin_distribution_runtime` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM pipelines i   WHERE ((i.id = pipeline_optin_distribution_runtime.pipeline_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `inbox_conversations`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert inbox_conversations` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM (inboxes i      JOIN users u ON ((u.id = auth.uid())))   WHERE ((i.id = inbox_conversations.inbox_id) AND (i.company_id = u.company_id))))` |
| `Select inbox_conversations` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (inboxes i      JOIN users u ON ((u.id = auth.uid())))   WHERE ((i.id = inbox_conversations.inbox_id) AND (i.company_id = u.company_id))))` | — |
| `Select inbox_conversations anon` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `Update inbox_conversations` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (inboxes i      JOIN users u ON ((u.id = auth.uid())))   WHERE ((i.id = inbox_conversations.inbox_id) AND (i.company_id = u.company_id))))` | — |

### `inbox_tags`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert inbox_tags` | INSERT | authenticated | PERMISSIVE | — | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` |
| `Select inbox_tags` | SELECT | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |
| `Update inbox_tags` | UPDATE | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |

### `inbox_conversation_unreads`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Delete inbox_conversation_unreads` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (inbox_conversations ic      JOIN inboxes i ON ((ic.inbox_id = i.id)))   WHERE ((ic.id = inbox_conversation_unreads.conversation_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Insert inbox_conversation_unreads` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM (inbox_conversations ic      JOIN inboxes i ON ((ic.inbox_id = i.id)))   WHERE ((ic.id = inbox_conversation_unreads.conversation_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` |
| `Select inbox_conversation_unreads` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (inbox_conversations ic      JOIN inboxes i ON ((ic.inbox_id = i.id)))   WHERE ((ic.id = inbox_conversation_unreads.conversation_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `app_entities`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert app_entities` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM (apps a      JOIN users u ON ((u.id = auth.uid())))   WHERE ((a.id = app_entities.app_id) AND (a.company_id = u.company_id))))` |
| `Select app_entities` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (apps a      JOIN users u ON ((u.id = auth.uid())))   WHERE ((a.id = app_entities.app_id) AND (a.company_id = u.company_id))))` | — |
| `Update app_entities` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (apps a      JOIN users u ON ((u.id = auth.uid())))   WHERE ((a.id = app_entities.app_id) AND (a.company_id = u.company_id))))` | — |

### `app_settings`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select app_settings` | SELECT | authenticated | PERMISSIVE | `true` | — |

### `ads_makeads_entities`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All ads_makeads_entities` | ALL | authenticated | PERMISSIVE | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` | — |

### `apps`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select apps` | SELECT | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |

### `app_types`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select app_types` | SELECT | authenticated | PERMISSIVE | `true` | — |

### `inbox_optin_distributions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Delete inbox_optin_distributions` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM inboxes i   WHERE ((i.id = inbox_optin_distributions.inbox_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Insert inbox_optin_distributions` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM inboxes i   WHERE ((i.id = inbox_optin_distributions.inbox_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` |
| `Select inbox_optin_distributions` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM inboxes i   WHERE ((i.id = inbox_optin_distributions.inbox_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Update inbox_optin_distributions` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM inboxes i   WHERE ((i.id = inbox_optin_distributions.inbox_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `inbox_webphone_logs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select inbox_webphone_logs` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (inbox_webphones iw      JOIN inboxes i ON ((iw.inbox_id = i.id)))   WHERE ((iw.id = inbox_webphone_logs.webphone_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `inbox_shortcuts`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert inbox_shortcuts` | INSERT | authenticated | PERMISSIVE | — | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` |
| `Select inbox_shortcuts` | SELECT | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |
| `Update inbox_shortcuts` | UPDATE | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |

### `agent_products`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All agent_products` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM agents a   WHERE ((a.id = agent_products.agent_id) AND (a.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `inbox_conversation_tags`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Delete inbox_conversation_tags` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (inbox_tags it      JOIN users u ON ((u.id = auth.uid())))   WHERE ((it.id = inbox_conversation_tags.tag_id) AND (it.company_id = u.company_id))))` | — |
| `Insert inbox_conversation_tags` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM (inbox_tags it      JOIN users u ON ((u.id = auth.uid())))   WHERE ((it.id = inbox_conversation_tags.tag_id) AND (it.company_id = u.company_id))))` |
| `Select inbox_conversation_tags` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (inbox_tags it      JOIN users u ON ((u.id = auth.uid())))   WHERE ((it.id = inbox_conversation_tags.tag_id) AND (it.company_id = u.company_id))))` | — |
| `Update inbox_conversation_tags` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (inbox_tags it      JOIN users u ON ((u.id = auth.uid())))   WHERE ((it.id = inbox_conversation_tags.tag_id) AND (it.company_id = u.company_id))))` | — |

### `inbox_user_shortcuts`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Delete inbox_user_shortcuts` | DELETE | authenticated | PERMISSIVE | `((user_id = auth.uid()) OR (user_id IN ( SELECT u.id    FROM users u   WHERE (u.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Insert inbox_user_shortcuts` | INSERT | authenticated | PERMISSIVE | — | `((user_id = auth.uid()) OR (user_id IN ( SELECT u.id    FROM users u   WHERE (u.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` |
| `Select inbox_user_shortcuts` | SELECT | authenticated | PERMISSIVE | `((user_id = auth.uid()) OR (user_id IN ( SELECT u.id    FROM users u   WHERE (u.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Update inbox_user_shortcuts` | UPDATE | authenticated | PERMISSIVE | `((user_id = auth.uid()) OR (user_id IN ( SELECT u.id    FROM users u   WHERE (u.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `onboarding_users`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert onboarding_users` | INSERT | authenticated | PERMISSIVE | — | `(user_id = auth.uid())` |
| `Select onboarding_users` | SELECT | authenticated | PERMISSIVE | `(user_id = auth.uid())` | — |
| `Update onboarding_users` | UPDATE | authenticated | PERMISSIVE | `(user_id = auth.uid())` | — |

### `onboardings`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select onboardings` | SELECT | authenticated | PERMISSIVE | `true` | — |

### `pipeline_import_items`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert pipeline_import_items` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM (pipeline_imports pi      JOIN users u ON ((u.id = auth.uid())))   WHERE ((pi.import_id = pipeline_import_items.import_id) AND (pi.company_id = u.company_id))))` |
| `Select pipeline_import_items` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (pipeline_imports pi      JOIN users u ON ((u.id = auth.uid())))   WHERE ((pi.import_id = pipeline_import_items.import_id) AND (pi.company_id = u.company_id))))` | — |
| `Update pipeline_import_items` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (pipeline_imports pi      JOIN users u ON ((u.id = auth.uid())))   WHERE ((pi.import_id = pipeline_import_items.import_id) AND (pi.company_id = u.company_id))))` | — |

### `pipeline_imports`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert pipeline_imports` | INSERT | authenticated | PERMISSIVE | — | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` |
| `Select pipeline_imports` | SELECT | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |

### `ads_makeads_entities_connections`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select ads_makeads_entities_connections` | SELECT | authenticated | PERMISSIVE | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` | — |

### `pipeline_deal_meet_transcriptions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert pipeline_deal_meet_transcriptions` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM ((pipeline_deal_meets pdm      JOIN pipeline_deals pd ON ((pd.id = pdm.deal_id)))      JOIN users u ON ((u.id = auth.uid())))   WHERE ((pdm.bot_id = pipeline_deal_meet_transcriptions.bot_id) AND (pd.company_id = u.company_id))))` |
| `Select pipeline_deal_meet_transcriptions` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM ((pipeline_deal_meets pdm      JOIN pipeline_deals pd ON ((pd.id = pdm.deal_id)))      JOIN users u ON ((u.id = auth.uid())))   WHERE ((pdm.bot_id = pipeline_deal_meet_transcriptions.bot_id) AND (pd.company_id = u.company_id))))` | — |

### `pipeline_deal_meet_settings`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert pipeline_deal_meet_settings` | INSERT | authenticated | PERMISSIVE | — | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` |
| `Select pipeline_deal_meet_settings` | SELECT | authenticated | PERMISSIVE | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` | — |
| `Update pipeline_deal_meet_settings` | UPDATE | authenticated | PERMISSIVE | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` | — |

### `inbox_optin_distribution_runtime`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Delete inbox_optin_distribution_runtime` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM inboxes i   WHERE ((i.id = inbox_optin_distribution_runtime.inbox_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Insert inbox_optin_distribution_runtime` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM inboxes i   WHERE ((i.id = inbox_optin_distribution_runtime.inbox_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` |
| `Select inbox_optin_distribution_runtime` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM inboxes i   WHERE ((i.id = inbox_optin_distribution_runtime.inbox_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Update inbox_optin_distribution_runtime` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM inboxes i   WHERE ((i.id = inbox_optin_distribution_runtime.inbox_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `onboarding_steps`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select onboarding_steps` | SELECT | public | PERMISSIVE | `true` | — |

### `onboarding_user_steps`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Delete onboarding_user_steps` | DELETE | authenticated | PERMISSIVE | `(user_id = auth.uid())` | — |
| `Inser onboarding_user_steps` | INSERT | authenticated | PERMISSIVE | — | `(user_id = auth.uid())` |
| `Select onboarding_user_steps` | SELECT | authenticated | PERMISSIVE | `(user_id = auth.uid())` | — |
| `Update onboarding_user_steps` | UPDATE | authenticated | PERMISSIVE | `(user_id = auth.uid())` | — |

### `workflow_logs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert workflow_logs` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM workflows w   WHERE ((w.id = workflow_logs.workflow_id) AND (w.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` |
| `Select workflow_logs` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM workflows w   WHERE ((w.id = workflow_logs.workflow_id) AND (w.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `workflow_sessions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select workflow_sessions` | SELECT | authenticated | PERMISSIVE | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` | — |

### `ads_facebook_pixel_custom_event`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All ads_facebook_pixel_custom_event` | ALL | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |

### `inbox_whatsapp_business_templates`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert inbox_whatsapp_business_templates` | INSERT | authenticated | PERMISSIVE | — | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` |
| `Select inbox_whatsapp_business_templates` | SELECT | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |

### `bi_dashboards`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert bi_dashboards` | INSERT | authenticated | PERMISSIVE | — | `(user_id = auth.uid())` |
| `Select bi_dashboards` | SELECT | authenticated | PERMISSIVE | `(user_id = auth.uid())` | — |
| `Update bi_dashboards` | UPDATE | authenticated | PERMISSIVE | `(user_id = auth.uid())` | — |

### `bi_metrics`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select bi_metrics` | SELECT | authenticated | PERMISSIVE | `true` | — |

### `bi_dashboard_widgets`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Delete bi_dashboard_widgets` | DELETE | authenticated | PERMISSIVE | `true` | — |
| `Insert bi_dashboard_widgets` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `Select bi_dashboard_widgets` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `Update bi_dashboard_widgets` | UPDATE | authenticated | PERMISSIVE | `true` | — |

### `pipeline_user_access`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Delete pipeline_user_access` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users u   WHERE ((u.id = pipeline_user_access.user_id) AND (u.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Insert pipeline_user_access` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM users u   WHERE ((u.id = pipeline_user_access.user_id) AND (u.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` |
| `Select pipeline_user_access` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users u   WHERE ((u.id = pipeline_user_access.user_id) AND (u.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `ai_chat_messages`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All ai_chat_messages` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM ai_chat_sessions acs   WHERE ((acs.id = ai_chat_messages.session_id) AND (acs.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `ads_makeads_tokens`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All ads_makeads_tokens 2` | ALL | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |

### `inbox_responsibility`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Delete inbox_responsibility` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM inboxes i   WHERE ((i.id = inbox_responsibility.inbox_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Insert inbox_responsibility` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM inboxes i   WHERE ((i.id = inbox_responsibility.inbox_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` |
| `Select inbox_responsibility` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM inboxes i   WHERE ((i.id = inbox_responsibility.inbox_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Update inbox_responsibility` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM inboxes i   WHERE ((i.id = inbox_responsibility.inbox_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `agent_business_address`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All agent_business_address` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (agent_business_profiles abp      JOIN agents a ON ((abp.agent_id = a.id)))   WHERE ((abp.id = agent_business_address.business_profile_id) AND (a.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `agents`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert agents` | INSERT | authenticated | PERMISSIVE | — | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` |
| `Select agents` | SELECT | authenticated | PERMISSIVE | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` | — |
| `Update agents` | UPDATE | authenticated | PERMISSIVE | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` | — |

### `ads_facebook_form_optins_distributions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All ads_facebook_form_optins_distributions` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM ads_facebook_forms aff   WHERE (((aff.facebook_form_id)::text = (ads_facebook_form_optins_distributions.facebook_form_id)::text) AND (aff.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `agent_inbox_connections`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Delete agent_inbox_connections` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM agents a   WHERE ((a.id = agent_inbox_connections.agent_id) AND (a.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Insert agent_inbox_connections` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM agents a   WHERE ((a.id = agent_inbox_connections.agent_id) AND (a.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` |
| `Seletc agent_inbox_connections` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM agents a   WHERE ((a.id = agent_inbox_connections.agent_id) AND (a.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Update agent_inbox_connections` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM agents a   WHERE ((a.id = agent_inbox_connections.agent_id) AND (a.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `agent_external_connections`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Delete agent_external_connections` | DELETE | authenticated | PERMISSIVE | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` | — |
| `Insert agent_external_connections` | INSERT | authenticated | PERMISSIVE | — | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` |
| `Select agent_external_connections` | SELECT | authenticated | PERMISSIVE | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` | — |
| `Update agent_external_connections` | UPDATE | authenticated | PERMISSIVE | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` | — |

### `currencys`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select currencys` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |

### `workflow_modules`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select workflow_modules` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |

### `contact_identifier_conversations`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All contact_identifier_conversations` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (contact_identifiers ci      JOIN contacts c ON ((ci.contact_id = c.id)))   WHERE ((ci.id = contact_identifier_conversations.identifier_id) AND (c.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `pipeline_deal_inbox_conversations`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All pipeline_deal_inbox_conversations` | ALL | authenticated | PERMISSIVE | `((EXISTS ( SELECT 1    FROM pipeline_deals pd   WHERE ((pd.id = pipeline_deal_inbox_conversations.deal_id) AND (pd.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid())))))) OR (EXISTS ( SELECT 1    FROM (inbox_conversations ic      JOIN inboxes i ON ((ic.inbox_id = i.id)))   WHERE ((ic.id = pipeline_deal_inbox_conversations.conversation_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid())))))))` | — |

### `agent_attachments`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert agent_attachments` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `Select agent_attachments` | SELECT | authenticated | PERMISSIVE | `true` | — |

### `inbox_settings`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert inbox_settings` | INSERT | anon, authenticated | PERMISSIVE | — | `true` |
| `Select inbox_settings` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |
| `Update inbox_settings` | UPDATE | anon, authenticated | PERMISSIVE | `true` | — |

### `inbox_broadcasts`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert inbox_broadcasts` | INSERT | authenticated | PERMISSIVE | — | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` |
| `Select inbox_broadcasts` | SELECT | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |
| `Update inbox_broadcasts` | UPDATE | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |

### `agent_trails`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All agent_trails` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM agents a   WHERE ((a.id = agent_trails.agent_id) AND (a.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `ai_chat_contexts`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All ai_chat_contexts` | ALL | authenticated | PERMISSIVE | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` | — |

### `pipeline_stage_facebook_pixel_events`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All pipeline_stage_facebook_pixel_events` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (pipeline_stages ps      JOIN pipelines p ON ((ps.pipeline_id = p.id)))   WHERE ((ps.id = pipeline_stage_facebook_pixel_events.stage_id) AND (p.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `inbox_webphones`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select inbox_webphones` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM inboxes i   WHERE ((i.id = inbox_webphones.inbox_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Update inbox_webphones` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM inboxes i   WHERE ((i.id = inbox_webphones.inbox_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `ads_facebook_form_optins_distribution_runtime`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All ads_facebook_form_optins_distribution_runtime` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM ads_facebook_forms aff   WHERE (((aff.facebook_form_id)::text = (ads_facebook_form_optins_distribution_runtime.facebook_form_id)::text) AND (aff.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `help_center_articles`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert help_center_articles` | INSERT | anon, authenticated | PERMISSIVE | — | `true` |
| `Select help_center_articles` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |
| `Update help_center_articles` | UPDATE | anon, authenticated | PERMISSIVE | `true` | — |

### `inbox_webphone_settings`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select inbox_webphone_settings` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (inbox_webphones iw      JOIN inboxes i ON ((iw.inbox_id = i.id)))   WHERE ((iw.id = inbox_webphone_settings.webphone_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Update inbox_webphone_settings` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (inbox_webphones iw      JOIN inboxes i ON ((iw.inbox_id = i.id)))   WHERE ((iw.id = inbox_webphone_settings.webphone_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `inbox_phone_call_logs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert inbox_phone_call_logs` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM (inbox_phones ip      JOIN inboxes i ON ((i.id = ip.inbox_id)))   WHERE ((ip.id = inbox_phone_call_logs.phone_id) AND (i.company_id = ( SELECT u.company_id            FROM users u           WHERE (u.id = auth.uid()))))))` |
| `Select inbox_phone_call_logs` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (inbox_phones ip      JOIN inboxes i ON ((i.id = ip.inbox_id)))   WHERE ((ip.id = inbox_phone_call_logs.phone_id) AND (i.company_id = ( SELECT u.company_id            FROM users u           WHERE (u.id = auth.uid()))))))` | — |

### `agent_tools`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable read access for all users` | SELECT | public | PERMISSIVE | `true` | — |

### `agent_trainings`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All agent_trainings` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM agents a   WHERE ((a.id = agent_trainings.agent_id) AND (a.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `agent_profiles`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Delete agent_profiles` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM agents a   WHERE ((a.id = agent_profiles.agent_id) AND (a.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Insert agent_profiles` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM agents a   WHERE ((a.id = agent_profiles.agent_id) AND (a.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` |
| `Select agent_profiles` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM agents a   WHERE ((a.id = agent_profiles.agent_id) AND (a.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Update agent_profiles` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM agents a   WHERE ((a.id = agent_profiles.agent_id) AND (a.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `pipelines`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable users to view all company pipelines` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users u   WHERE ((u.id = auth.uid()) AND (u.company_id = pipelines.company_id))))` | — |
| `Enable users to view their own data only` | SELECT | authenticated | PERMISSIVE | `(( SELECT auth.uid() AS uid) = id)` | — |
| `Insert pipelines` | INSERT | anon, authenticated | PERMISSIVE | — | `true` |
| `Update pipelines` | UPDATE | anon, authenticated | PERMISSIVE | `true` | — |

### `help_center_feedbacks`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert help_center_feedbacks` | INSERT | authenticated | PERMISSIVE | — | `(user_id = auth.uid())` |
| `Select help_center_feedbacks` | SELECT | authenticated | PERMISSIVE | `(user_id = auth.uid())` | — |
| `Update help_center_feedbacks` | UPDATE | authenticated | PERMISSIVE | `(user_id = auth.uid())` | — |

### `noshow_reasons`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert noshow_reasons` | INSERT | authenticated | PERMISSIVE | — | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` |
| `Select noshow_reasons` | SELECT | authenticated | PERMISSIVE | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` | — |
| `Update noshow_reasons` | UPDATE | authenticated | PERMISSIVE | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` | — |

### `inbox_whatsapp_business_template_prices`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select inbox_whatsapp_business_template_prices` | SELECT | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |

### `pipeline_deal_contact_reoptins`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert pipeline_deal_repeated` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM pipeline_deals pd   WHERE ((pd.id = pipeline_deal_contact_reoptins.deal_id) AND (pd.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` |
| `Select pipeline_deal_repeated` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM pipeline_deals pd   WHERE ((pd.id = pipeline_deal_contact_reoptins.deal_id) AND (pd.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `user_work_hours`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All user_work_hours` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users u   WHERE ((u.id = user_work_hours.user_id) AND (u.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `inbox_webphone_user_receive_calls`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All inbox_webphone_user_receive_calls` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users u   WHERE ((u.id = inbox_webphone_user_receive_calls.user_id) AND (u.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `user_licence_agreements`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert user_licence_agreements` | INSERT | authenticated | PERMISSIVE | — | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` |
| `Select user_licence_agreements` | SELECT | authenticated | PERMISSIVE | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` | — |

### `agent_tool_connections`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All agent_tool_connections` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM agents a   WHERE ((a.id = agent_tool_connections.agent_id) AND (a.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `ads_makeads_forms`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All ads_makeads_forms` | ALL | authenticated | PERMISSIVE | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` | — |

### `inbox_broadcast_lists`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert inbox_broadcast_lists` | INSERT | authenticated | PERMISSIVE | — | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` |
| `Select inbox_broadcast_lists` | SELECT | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |
| `Update inbox_broadcast_lists` | UPDATE | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |

### `ads_chatgptads_conversion_tokens`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All ads_chatgptads_conversion_tokens` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM ads_chatgptads_entities ace   WHERE ((ace.id = ads_chatgptads_conversion_tokens.account_id) AND (ace.company_id = ( SELECT u.company_id            FROM users u           WHERE (u.id = auth.uid()))))))` | — |

### `agent_published`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select agent_published` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM agents a   WHERE ((a.id = agent_published.agent_id) AND (a.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `inbox_webphone_calls`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert inbox_webphone_outcoming` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM (inbox_conversations ic      JOIN inboxes i ON ((ic.inbox_id = i.id)))   WHERE ((ic.id = inbox_webphone_calls.conversation_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` |
| `Select inbox_webphone_outcoming` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (inbox_conversations ic      JOIN inboxes i ON ((ic.inbox_id = i.id)))   WHERE ((ic.id = inbox_webphone_calls.conversation_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `pipeline_deal_meet_noshow`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert pipeline_deal_meet_noshow` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM (pipeline_deal_meets pdm      JOIN pipeline_deals pd ON ((pdm.deal_id = pd.id)))   WHERE ((pdm.id = pipeline_deal_meet_noshow.meet_id) AND (pd.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` |
| `Select pipeline_deal_meet_noshow` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (pipeline_deal_meets pdm      JOIN pipeline_deals pd ON ((pdm.deal_id = pd.id)))   WHERE ((pdm.id = pipeline_deal_meet_noshow.meet_id) AND (pd.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `inbox_whatsapp_business_template_windows`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert inbox_whatsapp_business_template_windows` | INSERT | authenticated | PERMISSIVE | — | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` |
| `Select inbox_whatsapp_business_template_windows` | SELECT | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |
| `Update inbox_whatsapp_business_template_windows` | UPDATE | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |

### `agent_tool_settings`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All agent_tool_settings` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM agents a   WHERE ((a.id = agent_tool_settings.agent_id) AND (a.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `pipeline_deal_quote_payments`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert pipeline_deal_quote_payments` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM (pipeline_deal_quotes pdq      JOIN pipeline_deals pd ON ((pdq.deal_id = pd.id)))   WHERE ((pdq.id = pipeline_deal_quote_payments.quote_id) AND (pd.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` |
| `Select pipeline_deal_quote_payments` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (pipeline_deal_quotes pdq      JOIN pipeline_deals pd ON ((pdq.deal_id = pd.id)))   WHERE ((pdq.id = pipeline_deal_quote_payments.quote_id) AND (pd.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Update pipeline_deal_quote_payments` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (pipeline_deal_quotes pdq      JOIN pipeline_deals pd ON ((pdq.deal_id = pd.id)))   WHERE ((pdq.id = pipeline_deal_quote_payments.quote_id) AND (pd.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `ads_chatgptads_tokens`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All ads_chatgptads_tokens` | ALL | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |

### `inbox_webphone_connection_status`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select inbox_webphone_connection_status` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM inboxes i   WHERE ((i.id = inbox_webphone_connection_status.inbox_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Update inbox_webphone_connection_status` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM inboxes i   WHERE ((i.id = inbox_webphone_connection_status.inbox_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `inbox_whatsapp_business_template_window_costs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert inbox_whatsapp_business_template_window_costs` | INSERT | authenticated | PERMISSIVE | — | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` |
| `Select inbox_whatsapp_business_template_window_costs` | SELECT | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |
| `Update inbox_whatsapp_business_template_window_costs` | UPDATE | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |

### `pipeline_webhook_optins`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert pipeline_webhook_optins` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM pipeline_webhooks pw   WHERE ((pw.id = pipeline_webhook_optins.webhook_id) AND (pw.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` |
| `Select pipeline_webhook_optins` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM pipeline_webhooks pw   WHERE ((pw.id = pipeline_webhook_optins.webhook_id) AND (pw.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Update pipeline_webhook_optins` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM pipeline_webhooks pw   WHERE ((pw.id = pipeline_webhook_optins.webhook_id) AND (pw.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `inbox_webphone_transcriptions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select inbox_webphone_transcriptions` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (inbox_webphones iw      JOIN inboxes i ON ((iw.inbox_id = i.id)))   WHERE ((iw.id = inbox_webphone_transcriptions.webphone_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `inbox_connection_status`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select inbox_connection_status` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (inboxes i      JOIN users u ON ((u.id = auth.uid())))   WHERE ((i.id = inbox_connection_status.inbox_id) AND (i.company_id = u.company_id))))` | — |

### `ads_facebook_pixel_standard_event`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select ads_facebook_pixel_standard_event` | SELECT | authenticated | PERMISSIVE | `true` | — |

### `inbox_broadcast_list_deals`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Delete inbox_broadcast_list_deals` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM inbox_broadcast_lists ibl   WHERE ((ibl.id = inbox_broadcast_list_deals.broadcast_list_id) AND (ibl.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Insert inbox_broadcast_list_deals` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM inbox_broadcast_lists ibl   WHERE ((ibl.id = inbox_broadcast_list_deals.broadcast_list_id) AND (ibl.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` |
| `Select inbox_broadcast_list_deals` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM inbox_broadcast_lists ibl   WHERE ((ibl.id = inbox_broadcast_list_deals.broadcast_list_id) AND (ibl.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Update inbox_broadcast_list_deals` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM inbox_broadcast_lists ibl   WHERE ((ibl.id = inbox_broadcast_list_deals.broadcast_list_id) AND (ibl.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `pipeline_deal_attachments`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert pipeline_deal_attachments` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `Select pipeline_deal_attachments` | SELECT | authenticated | PERMISSIVE | `true` | — |

### `ads_chatgptads_pixel_standard_event`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select ads_chatgptads_pixel_standard_event` | SELECT | authenticated | PERMISSIVE | `true` | — |

### `ads_chatgptads_event_conversions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert ads_chatgptads_event_conversions` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM ads_chatgptads_entities ace   WHERE ((ace.id = ads_chatgptads_event_conversions.account_id) AND (ace.company_id = ( SELECT u.company_id            FROM users u           WHERE (u.id = auth.uid()))))))` |
| `Select ads_chatgptads_event_conversions` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM ads_chatgptads_entities ace   WHERE ((ace.id = ads_chatgptads_event_conversions.account_id) AND (ace.company_id = ( SELECT u.company_id            FROM users u           WHERE (u.id = auth.uid()))))))` | — |
| `Update ads_chatgptads_event_conversions` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM ads_chatgptads_entities ace   WHERE ((ace.id = ads_chatgptads_event_conversions.account_id) AND (ace.company_id = ( SELECT u.company_id            FROM users u           WHERE (u.id = auth.uid()))))))` | — |

### `inbox_phones`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select inbox_phones` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM inboxes i   WHERE ((i.id = inbox_phones.inbox_id) AND (i.company_id = ( SELECT u.company_id            FROM users u           WHERE (u.id = auth.uid()))))))` | — |
| `Update inbox_phones` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM inboxes i   WHERE ((i.id = inbox_phones.inbox_id) AND (i.company_id = ( SELECT u.company_id            FROM users u           WHERE (u.id = auth.uid()))))))` | — |

### `ads_facebook_creative_ad_pipeline_deal_utms`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select ads_facebook_creative_ad_pipeline_deal_utms` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM pipeline_deals   WHERE ((pipeline_deals.id = ads_facebook_creative_ad_pipeline_deal_utms.deal_id) AND (pipeline_deals.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `inbox_phone_widget_domains`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All inbox_phone_widget_domains` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM ((inbox_phone_widgets ipw      JOIN inbox_phones ip ON ((ip.id = ipw.phone_id)))      JOIN inboxes i ON ((i.id = ip.inbox_id)))   WHERE ((ipw.id = inbox_phone_widget_domains.widget_id) AND (i.company_id = ( SELECT u.company_id            FROM users u           WHERE (u.id = auth.uid()))))))` | — |

### `inbox_phone_optins`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert inbox_phone_optins` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM (inbox_phones ip      JOIN inboxes i ON ((i.id = ip.inbox_id)))   WHERE ((ip.id = inbox_phone_optins.phone_id) AND (i.company_id = ( SELECT u.company_id            FROM users u           WHERE (u.id = auth.uid()))))))` |
| `Select inbox_phone_optins` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (inbox_phones ip      JOIN inboxes i ON ((i.id = ip.inbox_id)))   WHERE ((ip.id = inbox_phone_optins.phone_id) AND (i.company_id = ( SELECT u.company_id            FROM users u           WHERE (u.id = auth.uid()))))))` | — |
| `Update inbox_phone_optins` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (inbox_phones ip      JOIN inboxes i ON ((i.id = ip.inbox_id)))   WHERE ((ip.id = inbox_phone_optins.phone_id) AND (i.company_id = ( SELECT u.company_id            FROM users u           WHERE (u.id = auth.uid()))))))` | — |

### `ads_chatgptads_entities`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All ads_chatgptads_entities` | ALL | authenticated | PERMISSIVE | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` | — |

### `pipeline_webhook_logs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert pipeline_webhook_logs` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM pipeline_webhooks pw   WHERE ((pw.id = pipeline_webhook_logs.webhook_id) AND (pw.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` |
| `Select pipeline_webhook_logs` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM pipeline_webhooks pw   WHERE ((pw.id = pipeline_webhook_logs.webhook_id) AND (pw.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `inbox_phone_widgets`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert inbox_phone_widgets` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM (inbox_phones ip      JOIN inboxes i ON ((i.id = ip.inbox_id)))   WHERE ((ip.id = inbox_phone_widgets.phone_id) AND (i.company_id = ( SELECT u.company_id            FROM users u           WHERE (u.id = auth.uid()))))))` |
| `Select inbox_phone_widgets` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (inbox_phones ip      JOIN inboxes i ON ((i.id = ip.inbox_id)))   WHERE ((ip.id = inbox_phone_widgets.phone_id) AND (i.company_id = ( SELECT u.company_id            FROM users u           WHERE (u.id = auth.uid()))))))` | — |
| `Update inbox_phone_widgets` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (inbox_phones ip      JOIN inboxes i ON ((i.id = ip.inbox_id)))   WHERE ((ip.id = inbox_phone_widgets.phone_id) AND (i.company_id = ( SELECT u.company_id            FROM users u           WHERE (u.id = auth.uid()))))))` | — |

### `pipeline_deal_quote_attachments`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert pipeline_deal_quote_attachments` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM (pipeline_deal_quotes pdq      JOIN pipeline_deals pd ON ((pdq.deal_id = pd.id)))   WHERE ((pdq.id = pipeline_deal_quote_attachments.quote_id) AND (pd.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` |
| `Select pipeline_deal_quote_attachments` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (pipeline_deal_quotes pdq      JOIN pipeline_deals pd ON ((pdq.deal_id = pd.id)))   WHERE ((pdq.id = pipeline_deal_quote_attachments.quote_id) AND (pd.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Update pipeline_deal_quote_attachments` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (pipeline_deal_quotes pdq      JOIN pipeline_deals pd ON ((pdq.deal_id = pd.id)))   WHERE ((pdq.id = pipeline_deal_quote_attachments.quote_id) AND (pd.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `inbox_phone_transcriptions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select inbox_phone_transcriptions` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (inbox_phones      JOIN inboxes ON ((inboxes.id = inbox_phones.inbox_id)))   WHERE ((inbox_phones.id = inbox_phone_transcriptions.phone_id) AND (inboxes.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `inbox_broadcast_messages`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Delete inbox_broadcast_messages` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM inbox_broadcasts ib   WHERE ((ib.id = inbox_broadcast_messages.broadcast_id) AND (ib.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Insert inbox_broadcast_messages` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM inbox_broadcasts ib   WHERE ((ib.id = inbox_broadcast_messages.broadcast_id) AND (ib.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` |
| `Select inbox_broadcast_messages` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM inbox_broadcasts ib   WHERE ((ib.id = inbox_broadcast_messages.broadcast_id) AND (ib.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |
| `Update inbox_broadcast_messages` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM inbox_broadcasts ib   WHERE ((ib.id = inbox_broadcast_messages.broadcast_id) AND (ib.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `agent_inbox_webhooks`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select agent_inbox_webhooks` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM inboxes i   WHERE ((i.id = agent_inbox_webhooks.inbox_id) AND (i.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `inbox_phone_optins_distributions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Delete inbox_phone_optins_distributions` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (inbox_phones ip      JOIN inboxes i ON ((i.id = ip.inbox_id)))   WHERE ((ip.id = inbox_phone_optins_distributions.phone_id) AND (i.company_id = ( SELECT u.company_id            FROM users u           WHERE (u.id = auth.uid()))))))` | — |
| `Insert inbox_phone_optins_distributions` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM (inbox_phones ip      JOIN inboxes i ON ((i.id = ip.inbox_id)))   WHERE ((ip.id = inbox_phone_optins_distributions.phone_id) AND (i.company_id = ( SELECT u.company_id            FROM users u           WHERE (u.id = auth.uid()))))))` |
| `Select inbox_phone_optins_distributions` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (inbox_phones ip      JOIN inboxes i ON ((i.id = ip.inbox_id)))   WHERE ((ip.id = inbox_phone_optins_distributions.phone_id) AND (i.company_id = ( SELECT u.company_id            FROM users u           WHERE (u.id = auth.uid()))))))` | — |
| `Update inbox_phone_optins_distributions` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (inbox_phones ip      JOIN inboxes i ON ((i.id = ip.inbox_id)))   WHERE ((ip.id = inbox_phone_optins_distributions.phone_id) AND (i.company_id = ( SELECT u.company_id            FROM users u           WHERE (u.id = auth.uid()))))))` | — |

### `ads_chatgptads_pixel_custom_event`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All ads_chatgptads_pixel_custom_event` | ALL | authenticated | PERMISSIVE | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` | — |

### `user_settings`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert user_settings` | INSERT | authenticated | PERMISSIVE | — | `(user_id = auth.uid())` |
| `Insert user_settings by company_id` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.id = user_settings.user_id) AND (users.company_id = ( SELECT users_1.company_id            FROM users users_1           WHERE (users_1.id = auth.uid()))))))` |
| `Select user_settings` | SELECT | authenticated | PERMISSIVE | `(user_id = auth.uid())` | — |
| `Select user_settings (company_id)` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.id = user_settings.user_id) AND (users.company_id = ( SELECT users_1.company_id            FROM users users_1           WHERE (users_1.id = auth.uid()))))))` | — |
| `Update user_settings` | UPDATE | authenticated | PERMISSIVE | `(user_id = auth.uid())` | — |
| `Update user_settings (company_id)` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.id = user_settings.user_id) AND (users.company_id = ( SELECT users_1.company_id            FROM users users_1           WHERE (users_1.id = auth.uid()))))))` | — |

### `pipeline_deal_click_ids`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert pipeline_deal_click_ids` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM pipeline_deals pd   WHERE ((pd.id = pipeline_deal_click_ids.deal_id) AND (pd.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` |
| `Select pipeline_deal_click_ids` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM pipeline_deals pd   WHERE ((pd.id = pipeline_deal_click_ids.deal_id) AND (pd.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `ads_chatgptads_pixels`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert ads_chatgptads_pixels` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM ads_chatgptads_entities ace   WHERE ((ace.id = ads_chatgptads_pixels.account_id) AND (ace.company_id = ( SELECT u.company_id            FROM users u           WHERE (u.id = auth.uid()))))))` |
| `Select ads_chatgptads_pixels` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM ads_chatgptads_entities ace   WHERE ((ace.id = ads_chatgptads_pixels.account_id) AND (ace.company_id = ( SELECT u.company_id            FROM users u           WHERE (u.id = auth.uid()))))))` | — |
| `Update ads_chatgptads_pixels` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM ads_chatgptads_entities ace   WHERE ((ace.id = ads_chatgptads_pixels.account_id) AND (ace.company_id = ( SELECT u.company_id            FROM users u           WHERE (u.id = auth.uid()))))))` | — |

### `agent_providers`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select agent_providers` | SELECT | authenticated | PERMISSIVE | `true` | — |

### `agent_apis`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert agent_apis` | INSERT | authenticated | PERMISSIVE | — | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` |
| `Select agent_apis` | SELECT | authenticated | PERMISSIVE | `(company_id = ( SELECT u.company_id    FROM users u   WHERE (u.id = auth.uid())))` | — |

### `agent_tool_distribution_runtime`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All agent_tool_distribution_runtime` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM agents a   WHERE ((a.id = agent_tool_distribution_runtime.agent_id) AND (a.company_id = ( SELECT users.company_id            FROM users           WHERE (users.id = auth.uid()))))))` | — |

### `user_setting_definitions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Select user_setting_definitions` | SELECT | authenticated | PERMISSIVE | `true` | — |

### `inbox_conversation_agent_followups`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `All inbox_conversation_agent_followups` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM agents a   WHERE ((a.id = inbox_conversation_agent_followups.agent_id) AND (a.company_id = ( SELECT u.company_id            FROM users u           WHERE (u.id = auth.uid()))))))` | — |

### `inbox_phone_calls`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert inbox_phone_calls` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM (inbox_phones ip      JOIN inboxes i ON ((i.id = ip.inbox_id)))   WHERE ((ip.id = inbox_phone_calls.phone_id) AND (i.company_id = ( SELECT u.company_id            FROM users u           WHERE (u.id = auth.uid()))))))` |
| `Select inbox_phone_calls` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (inbox_phones ip      JOIN inboxes i ON ((i.id = ip.inbox_id)))   WHERE ((ip.id = inbox_phone_calls.phone_id) AND (i.company_id = ( SELECT u.company_id            FROM users u           WHERE (u.id = auth.uid()))))))` | — |

### `pipeline_webhooks`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Insert pipeline_webhooks` | INSERT | authenticated | PERMISSIVE | — | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` |
| `Select pipeline_webhooks` | SELECT | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |
| `Update pipeline_webhooks` | UPDATE | authenticated | PERMISSIVE | `(company_id = ( SELECT users.company_id    FROM users   WHERE (users.id = auth.uid())))` | — |
