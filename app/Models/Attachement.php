<?php

namespace App\Models;

/**
 * Model class supporting "Attachement" naming as requested by the user,
 * inheriting the full implementation of Attachment.
 */
class Attachement extends Attachment
{
    protected $table = 'attachments';
}
