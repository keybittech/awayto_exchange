package handlers

import (
	"av3api/pkg/types"
	"av3api/pkg/util"
	"errors"
	"net/http"
	"time"
)

func (h *Handlers) PostGroupFile(w http.ResponseWriter, req *http.Request, data *types.PostGroupFileRequest) (*types.PostGroupFileResponse, error) {
	session := h.Redis.ReqSession(req)

	var groupFileId string

	err := h.Database.Client().QueryRow(`
		INSERT INTO dbtable_schema.group_files (group_id, file_id, created_on, created_sub)
		VALUES ($1, $2, $3, $4::uuid)
		RETURNING id
	`, session.GroupId, data.GetFileId(), time.Now().Local().UTC(), session.UserSub).Scan(&groupFileId)

	if err != nil {
		return nil, util.ErrCheck(err)
	}

	if groupFileId == "" {
		return nil, util.ErrCheck(errors.New("failed to insert group file"))
	}

	return &types.PostGroupFileResponse{Id: groupFileId}, nil
}

func (h *Handlers) PatchGroupFile(w http.ResponseWriter, req *http.Request, data *types.PatchGroupFileRequest) (*types.PatchGroupFileResponse, error) {
	session := h.Redis.ReqSession(req)

	_, err := h.Database.Client().Exec(`
		UPDATE dbtable_schema.group_files
		SET group_id = $2, file_id = $3, updated_sub = $4, updated_on = $5
		WHERE id = $1
	`, data.GetId(), session.GroupId, data.GetFileId(), session.UserSub, time.Now().Local().UTC())

	if err != nil {
		return nil, util.ErrCheck(err)
	}

	return &types.PatchGroupFileResponse{Success: true}, nil
}

func (h *Handlers) GetGroupFiles(w http.ResponseWriter, req *http.Request, data *types.GetGroupFilesRequest) (*types.GetGroupFilesResponse, error) {
	session := h.Redis.ReqSession(req)

	var groupFiles []*types.IGroupFile

	err := h.Database.QueryRows(&groupFiles, `
		SELECT * FROM dbview_schema.enabled_group_files
		WHERE "groupId" = $1
	`, session.GroupId)

	if err != nil {
		return nil, util.ErrCheck(err)
	}

	return &types.GetGroupFilesResponse{Files: groupFiles}, nil
}

func (h *Handlers) GetGroupFileById(w http.ResponseWriter, req *http.Request, data *types.GetGroupFileByIdRequest) (*types.GetGroupFileByIdResponse, error) {
	session := h.Redis.ReqSession(req)

	var groupFiles []*types.IGroupFile

	err := h.Database.QueryRows(&groupFiles, `
		SELECT * FROM dbview_schema.enabled_group_files
		WHERE "groupId" = $1 AND id = $2
	`, session.GroupId, data.GetId())

	if err != nil {
		return nil, util.ErrCheck(err)
	}

	return &types.GetGroupFileByIdResponse{File: groupFiles[0]}, nil
}

func (h *Handlers) DeleteGroupFile(w http.ResponseWriter, req *http.Request, data *types.DeleteGroupFileRequest) (*types.DeleteGroupFileResponse, error) {

	_, err := h.Database.Client().Exec(`
		DELETE FROM dbtable_schema.group_files
		WHERE id = $1
	`, data.GetId())

	if err != nil {
		return nil, util.ErrCheck(err)
	}

	return &types.DeleteGroupFileResponse{Success: true}, nil
}
