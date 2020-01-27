import {
  AuthorizationContext,
  AuthorizationMetadata,
  AuthorizationDecision,
  AuthorizationRequest,
} from '@loopback/authorization';
import _ from 'lodash';
import {UserProfile, securityId} from '@loopback/security';

interface MyAuthorizationMetadata extends AuthorizationMetadata {
  currentUser?: UserProfile;
  decision?: AuthorizationDecision;
}

// Instance level authorizer
// Can be also registered as an authorizer, depends on users' need.
export async function basicAuthorization(
  authorizationCtx: AuthorizationContext,
  metadata: MyAuthorizationMetadata,
) {

  // No access if authorization details are missing
  let currentUser: UserProfile;
  if (authorizationCtx.principals.length > 0) {
    const user = _.pick(authorizationCtx.principals[0], [
      'id',
      'name',
      'roles',
    ]);
    currentUser = {[securityId]: user.id, name: user.name, roles: user.roles};
  } else {
    return AuthorizationDecision.DENY;
  }

  // Authorize everything that does not have a allowedRoles property
  if (!metadata.allowedRoles) {
    return AuthorizationDecision.ALLOW;
  }

  const request: AuthorizationRequest = {
    subject: currentUser[securityId],
    object: metadata.resource ?? authorizationCtx.resource,
    action: (metadata.scopes && metadata.scopes[0]) || 'execute',
  };

  let roleIsAllowed = false;
  for (const role of currentUser.roles) {
    if (metadata.allowedRoles!.includes(role)) {
      roleIsAllowed = true;
      break;
    }
  }

  if (!roleIsAllowed) {
    return AuthorizationDecision.DENY;
  }

  // Admin and support accounts bypass id verification
  if (currentUser.roles.includes('admin') || currentUser.roles.includes('support')) {
    return AuthorizationDecision.ALLOW;
  }

  // Allow access only to model owners
  if (currentUser[securityId] === authorizationCtx.invocationContext.args[0]) {
    return AuthorizationDecision.ALLOW;
  }

  return AuthorizationDecision.DENY;
}