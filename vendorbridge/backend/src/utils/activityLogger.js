export const logActivity = async (supabaseAdmin, {
  userId, action, entityType, entityId, entityLabel, description, metadata
}) => {
  try {
    await supabaseAdmin.from('activity_logs').insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_label: entityLabel,
      description,
      metadata: metadata || {},
    });
  } catch (err) {
    console.error('Activity log failed:', err.message);
  }
};
