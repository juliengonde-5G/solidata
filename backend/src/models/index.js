const sequelize = require('../config/database');
const User = require('./User');
const JobPosition = require('./JobPosition');
const Candidate = require('./Candidate');
const CandidateHistory = require('./CandidateHistory');
const PersonalityTest = require('./PersonalityTest');
const Employee = require('./Employee');
const Skill = require('./Skill');
const Vehicle = require('./Vehicle');
const Planning = require('./Planning');
const Route = require('./Route');
const RouteTemplatePoint = require('./RouteTemplatePoint');
const CollectionPoint = require('./CollectionPoint');
const DailyRoute = require('./DailyRoute');
const DailyRoutePoint = require('./DailyRoutePoint');
const GPSTrack = require('./GPSTrack');
const WeightRecord = require('./WeightRecord');
const Collection = require('./Collection');
const CollectionReport = require('./CollectionReport');
const RefashionDeclaration = require('./RefashionDeclaration');
const AppSettings = require('./AppSettings');
const WorkStation = require('./WorkStation');
const DailyAssignment = require('./DailyAssignment');
const EmployeeDayStatus = require('./EmployeeDayStatus');
const VakEvent = require('./VakEvent');
const VakWorkStation = require('./VakWorkStation');
const VakAssignment = require('./VakAssignment');

// === Associations Recrutement ===
Candidate.belongsTo(JobPosition, { foreignKey: 'jobPositionId', as: 'jobPosition' });
JobPosition.hasMany(Candidate, { foreignKey: 'jobPositionId', as: 'candidates' });

Candidate.hasMany(CandidateHistory, { foreignKey: 'candidateId', as: 'history' });
CandidateHistory.belongsTo(Candidate, { foreignKey: 'candidateId' });

CandidateHistory.belongsTo(User, { foreignKey: 'changedBy', as: 'changedByUser' });

Candidate.hasOne(PersonalityTest, { foreignKey: 'candidateId', as: 'personalityTest' });
PersonalityTest.belongsTo(Candidate, { foreignKey: 'candidateId' });

Candidate.belongsTo(User, { foreignKey: 'interviewerId', as: 'interviewer' });

// === Associations Équipe ===
Employee.hasMany(Skill, { foreignKey: 'employeeId', as: 'skills' });
Skill.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

Employee.hasMany(Planning, { foreignKey: 'employeeId', as: 'plannings' });
Planning.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

Vehicle.hasMany(Planning, { foreignKey: 'vehicleId', as: 'plannings' });
Planning.belongsTo(Vehicle, { foreignKey: 'vehicleId', as: 'vehicle' });

Route.hasMany(Planning, { foreignKey: 'routeId', as: 'plannings' });
Planning.belongsTo(Route, { foreignKey: 'routeId', as: 'route' });

// === Associations Affectations quotidiennes ===
WorkStation.hasMany(DailyAssignment, { foreignKey: 'workStationId', as: 'assignments' });
DailyAssignment.belongsTo(WorkStation, { foreignKey: 'workStationId', as: 'workStation' });

Employee.hasMany(DailyAssignment, { foreignKey: 'employeeId', as: 'dailyAssignments' });
DailyAssignment.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

DailyAssignment.belongsTo(User, { foreignKey: 'confirmedBy', as: 'confirmedByUser' });

Employee.hasMany(EmployeeDayStatus, { foreignKey: 'employeeId', as: 'dayStatuses' });
EmployeeDayStatus.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

// === Associations VAK ===
VakEvent.hasMany(VakAssignment, { foreignKey: 'vakEventId', as: 'assignments' });
VakAssignment.belongsTo(VakEvent, { foreignKey: 'vakEventId', as: 'vakEvent' });

VakWorkStation.hasMany(VakAssignment, { foreignKey: 'vakWorkStationId', as: 'assignments' });
VakAssignment.belongsTo(VakWorkStation, { foreignKey: 'vakWorkStationId', as: 'vakWorkStation' });

Employee.hasMany(VakAssignment, { foreignKey: 'employeeId', as: 'vakAssignments' });
VakAssignment.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

// === Associations Collecte — Route Templates ===
Route.hasMany(RouteTemplatePoint, { foreignKey: 'routeId', as: 'templatePoints' });
RouteTemplatePoint.belongsTo(Route, { foreignKey: 'routeId', as: 'route' });

CollectionPoint.hasMany(RouteTemplatePoint, { foreignKey: 'collectionPointId', as: 'routeLinks' });
RouteTemplatePoint.belongsTo(CollectionPoint, { foreignKey: 'collectionPointId', as: 'collectionPoint' });

// Many-to-many through RouteTemplatePoint
Route.belongsToMany(CollectionPoint, { through: RouteTemplatePoint, foreignKey: 'routeId', otherKey: 'collectionPointId', as: 'points' });
CollectionPoint.belongsToMany(Route, { through: RouteTemplatePoint, foreignKey: 'collectionPointId', otherKey: 'routeId', as: 'routes' });

// === Associations Collecte — Daily Routes ===
Route.hasMany(DailyRoute, { foreignKey: 'templateRouteId', as: 'dailyRoutes' });
DailyRoute.belongsTo(Route, { foreignKey: 'templateRouteId', as: 'templateRoute' });

Vehicle.hasMany(DailyRoute, { foreignKey: 'vehicleId', as: 'dailyRoutes' });
DailyRoute.belongsTo(Vehicle, { foreignKey: 'vehicleId', as: 'vehicle' });

Employee.hasMany(DailyRoute, { foreignKey: 'driverId', as: 'driverRoutes' });
DailyRoute.belongsTo(Employee, { foreignKey: 'driverId', as: 'driver' });

Employee.hasMany(DailyRoute, { foreignKey: 'followerId', as: 'followerRoutes' });
DailyRoute.belongsTo(Employee, { foreignKey: 'followerId', as: 'follower' });

// Daily Route Points (points d'une tournée journalière)
DailyRoute.hasMany(DailyRoutePoint, { foreignKey: 'dailyRouteId', as: 'routePoints' });
DailyRoutePoint.belongsTo(DailyRoute, { foreignKey: 'dailyRouteId', as: 'dailyRoute' });

CollectionPoint.hasMany(DailyRoutePoint, { foreignKey: 'collectionPointId', as: 'dailyVisits' });
DailyRoutePoint.belongsTo(CollectionPoint, { foreignKey: 'collectionPointId', as: 'collectionPoint' });

// GPS Tracking
DailyRoute.hasMany(GPSTrack, { foreignKey: 'dailyRouteId', as: 'gpsTrack' });
GPSTrack.belongsTo(DailyRoute, { foreignKey: 'dailyRouteId', as: 'dailyRoute' });

// Weight Records
DailyRoute.hasMany(WeightRecord, { foreignKey: 'dailyRouteId', as: 'weightRecords' });
WeightRecord.belongsTo(DailyRoute, { foreignKey: 'dailyRouteId', as: 'dailyRoute' });

// === Associations Collecte (legacy — Collection records) ===
Route.hasMany(Collection, { foreignKey: 'routeId', as: 'collections' });
Collection.belongsTo(Route, { foreignKey: 'routeId', as: 'route' });

CollectionPoint.hasMany(Collection, { foreignKey: 'collectionPointId', as: 'collections' });
Collection.belongsTo(CollectionPoint, { foreignKey: 'collectionPointId', as: 'collectionPoint' });

Employee.hasMany(Collection, { foreignKey: 'employeeId', as: 'collections' });
Collection.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

Vehicle.hasMany(Collection, { foreignKey: 'vehicleId', as: 'collections' });
Collection.belongsTo(Vehicle, { foreignKey: 'vehicleId', as: 'vehicle' });

DailyRoute.hasMany(Collection, { foreignKey: 'dailyRouteId', as: 'collections' });
Collection.belongsTo(DailyRoute, { foreignKey: 'dailyRouteId', as: 'dailyRoute' });

// === Associations Reporting ===
CollectionReport.hasMany(RefashionDeclaration, { foreignKey: 'reportId', as: 'declarations' });
RefashionDeclaration.belongsTo(CollectionReport, { foreignKey: 'reportId', as: 'report' });

module.exports = {
  sequelize,
  User,
  JobPosition,
  Candidate,
  CandidateHistory,
  PersonalityTest,
  Employee,
  Skill,
  Vehicle,
  Planning,
  Route,
  RouteTemplatePoint,
  CollectionPoint,
  DailyRoute,
  DailyRoutePoint,
  GPSTrack,
  WeightRecord,
  Collection,
  CollectionReport,
  RefashionDeclaration,
  AppSettings,
  WorkStation,
  DailyAssignment,
  EmployeeDayStatus,
  VakEvent,
  VakWorkStation,
  VakAssignment
};
